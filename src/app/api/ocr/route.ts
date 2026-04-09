import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text } = await request.json();
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You are a medical bill parser for Indian hospitals. Extract expense information from OCR text of hospital bills, pharmacy receipts, or medical invoices.

Respond ONLY with a valid JSON object, no other text, no markdown backticks:
{
  "description": "brief description of the medical service or medicine",
  "amount": 0,
  "hospital_name": "name of hospital, clinic or pharmacy or null",
  "doctor_name": "doctor name if present or null",
  "expense_date": "YYYY-MM-DD format, today if not found",
  "category": "one of: Consultation, Medicines, Diagnostics, Surgery, Physiotherapy, Dental, Vision, Mental Health, Vaccination, Other",
  "notes": "any other relevant details like medicine names, test names, or null"
}

Rules:
- amount must be a number (total bill amount in INR, not individual items)
- If multiple amounts found, use the largest/final total
- expense_date default is ${new Date().toISOString().split("T")[0]}
- description should be concise (max 60 chars)`,
        },
        {
          role: "user",
          content: `Parse this medical bill OCR text:\n\n${text.slice(0, 2000)}`,
        },
      ],
    });

    const rawJson = response.choices[0].message.content ?? "";
    const clean = rawJson.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    parsed.amount = parsed.amount ? Number(parsed.amount) : 0;

    return NextResponse.json({ success: true, extracted: parsed });
  } catch (error) {
    console.error("OCR parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse bill text." },
      { status: 500 },
    );
  }
}
