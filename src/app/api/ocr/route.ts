import { createWorker } from "tesseract.js";
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

    const formData = await request.formData();
    const file = formData.get("image") as File;
    if (!file)
      return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run Tesseract OCR
    const worker = await createWorker("eng", 1, {
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      logger: () => {},
      errorHandler: () => {},
    });
    const {
      data: { text },
    } = await worker.recognize(buffer);
    await worker.terminate();

    if (!text || text.trim().length < 10) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from image. Please try a clearer photo.",
        },
        { status: 400 },
      );
    }

    // Use Groq to parse the raw text into structured expense data
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
  "hospital_name": "name of hospital, clinic or pharmacy",
  "doctor_name": "doctor name if present or null",
  "expense_date": "YYYY-MM-DD format, today if not found",
  "category": "one of: Consultation, Medicines, Diagnostics, Surgery, Physiotherapy, Dental, Vision, Mental Health, Vaccination, Other",
  "notes": "any other relevant details like medicine names, test names, or null"
}

Rules:
- amount must be a number (total bill amount in INR, not individual items)
- If multiple amounts found, use the largest/final total
- expense_date default is ${new Date().toISOString().split("T")[0]}
- description should be concise (max 60 chars)
- If hospital name not found, use null`,
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

    // Ensure amount is a number
    parsed.amount = parsed.amount ? Number(parsed.amount) : 0;

    return NextResponse.json({
      success: true,
      extracted: parsed,
      rawText: text.slice(0, 500), // for debugging
    });
  } catch (error) {
    console.error("OCR error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to process image. Please try again with a clearer photo.",
      },
      { status: 500 },
    );
  }
}
