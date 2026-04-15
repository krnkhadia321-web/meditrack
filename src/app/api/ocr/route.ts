import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const PROMPTS: Record<string, string> = {
  expense: `You are a medical bill parser for Indian hospitals. Extract expense information from OCR text of hospital bills, pharmacy receipts, or medical invoices.

Respond ONLY with a valid JSON object, no markdown backticks, no other text:
{
  "description": "brief description of the medical service or medicine",
  "amount": 0,
  "hospital_name": "name of hospital, clinic or pharmacy or null",
  "doctor_name": "doctor name if present or null",
  "expense_date": "YYYY-MM-DD format, today if not found",
  "category": "one of: Consultation, Medicines, Diagnostics, Surgery, Physiotherapy, Dental, Vision, Mental Health, Vaccination, Other",
  "notes": "any other relevant details or null"
}

Rules:
- amount must be a number (total bill amount in INR)
- If multiple amounts found, use the largest/final total
- expense_date default is ${new Date().toISOString().split("T")[0]}
- description should be concise (max 60 chars)`,

  record: `You are a medical document parser for Indian patients. Extract information from OCR text of health records, lab reports, prescriptions, discharge summaries, or vaccination certificates.

Respond ONLY with a valid JSON object, no markdown backticks, no other text:
{
  "title": "descriptive title for this record e.g. CBC Blood Test Report - April 2026",
  "record_type": "one of: prescription, report, discharge, vaccination, other",
  "record_date": "YYYY-MM-DD format, today if not found",
  "notes": "key findings, test results, doctor observations, medicines prescribed, or important details in 2-3 sentences"
}

Rules:
- title should be specific and include the type of document and date if found
- record_date default is ${new Date().toISOString().split("T")[0]}
- notes should capture the most important medical information from the document`,

  medicine: `You are a prescription parser for Indian patients. Extract medicine details from OCR text of prescriptions or medicine labels.

Respond ONLY with a valid JSON object, no markdown backticks, no other text:
{
  "name": "brand name of the medicine",
  "generic_name": "generic or salt name e.g. Paracetamol, Metformin HCl",
  "dosage": "strength e.g. 500mg, 10mg",
  "frequency": "one of: Once daily, Twice daily, Three times daily, Every 8 hours, Every 6 hours, Weekly, As needed",
  "total_quantity": 0,
  "prescribed_by": "doctor name or null",
  "notes": "special instructions e.g. take after meals, avoid with dairy, or null"
}

Rules:
- total_quantity must be a number (number of pills/tablets)
- If quantity not found, use 0
- frequency must exactly match one of the given options
- Extract only the FIRST or PRIMARY medicine if multiple are listed`,

  vitals: `You are a medical vitals parser for Indian patients. Extract vital sign readings from OCR text of lab reports, glucometer screens, BP monitor screens, or health checkup reports.

Respond ONLY with a valid JSON object, no markdown backticks, no other text:
{
  "readings": [
    {
      "type": "one of: blood_pressure, blood_sugar, weight, spo2, heart_rate, temperature",
      "value": 0,
      "value2": null,
      "unit": "the unit e.g. mmHg, mg/dL, kg, %, bpm, °F",
      "notes": "context e.g. fasting, post-meal, resting, or null"
    }
  ],
  "logged_at": "YYYY-MM-DDTHH:mm format, now if not found",
  "source": "device or report name if identifiable e.g. Omron BP Monitor, Apollo Lab Report"
}

Rules:
- For blood_pressure: value = systolic, value2 = diastolic
- Extract ALL vitals found in the document, not just one
- value and value2 must be numbers
- logged_at default is ${new Date().toISOString().slice(0, 16)}
- If only one vital found, readings array will have one item`,
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text, type = "expense" } = await request.json();
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const prompt = PROMPTS[type] ?? PROMPTS.expense;

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 500,
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `Parse this medical document OCR text:\n\n${text.slice(0, 2000)}`,
        },
      ],
    });

    const rawJson = response.choices[0].message.content ?? "";
    const clean = rawJson.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Coerce types based on document type
    if (type === "expense") {
      parsed.amount = parsed.amount ? Number(parsed.amount) : 0;
    }
    if (type === "medicine") {
      parsed.total_quantity = parsed.total_quantity
        ? Number(parsed.total_quantity)
        : 0;
    }
    if (type === "record") {
      // Ensure date is in YYYY-MM-DD format
      if (parsed.record_date) {
        try {
          parsed.record_date = new Date(parsed.record_date)
            .toISOString()
            .split("T")[0];
        } catch {
          parsed.record_date = new Date().toISOString().split("T")[0];
        }
      }
      // Ensure record_type is valid
      const validTypes = [
        "prescription",
        "report",
        "discharge",
        "vaccination",
        "other",
      ];
      if (!validTypes.includes(parsed.record_type)) {
        parsed.record_type = "other";
      }
    }
    if (type === "vitals") {
      parsed.readings = (parsed.readings ?? []).map((r: any) => ({
        ...r,
        value: Number(r.value) || 0,
        value2: r.value2 ? Number(r.value2) : null,
      }));
    }

    return NextResponse.json({ success: true, extracted: parsed });
  } catch (error) {
    console.error("OCR parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse document." },
      { status: 500 },
    );
  }
}
