import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic'

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
    if (!text || text.trim().length < 5) {
      return NextResponse.json(
        { error: "No prescription text provided" },
        { status: 400 },
      );
    }

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `You are a medical explainer for Indian patients. Analyse prescription text and explain it in simple, plain English that a non-medical person can understand.

Respond ONLY with a valid JSON object, no markdown backticks, no other text:
{
  "doctor": "doctor name if found or null",
  "patient": "patient name if found or null",
  "date": "prescription date if found or null",
  "diagnosis": "what condition is being treated in plain English, or null if not clear",
  "medicines": [
    {
      "brandName": "exact brand name as written",
      "genericName": "generic/salt name",
      "purpose": "what this medicine does in 1 simple sentence",
      "dosage": "how to take it as written on prescription",
      "duration": "how long to take it",
      "sideEffects": "2-3 most common side effects in plain language",
      "genericAlternative": "cheaper generic brand name available in India",
      "estimatedSavings": "estimated % savings with generic e.g. 60-70%",
      "janAushadhi": true or false — whether available at Jan Aushadhi stores,
      "importantNote": "one important thing patient should know, or null"
    }
  ],
  "questionsToAsk": [
    "3-4 important questions the patient should ask their doctor"
  ],
  "generalAdvice": "2-3 sentences of general advice about this prescription",
  "redFlags": "any concerning combinations or unusually expensive medicines to flag, or null"
}

Rules:
- Always explain in simple Hindi-friendly English (avoid medical jargon)
- genericAlternative must be a real Indian brand or Jan Aushadhi generic name
- If a medicine name is unclear from OCR, make your best guess based on context
- questionsToAsk should be practical and specific to these medicines`,
        },
        {
          role: "user",
          content: `Analyse this prescription:\n\n${text.slice(0, 3000)}`,
        },
      ],
    });

    const rawJson = response.choices[0].message.content ?? "";
    const clean = rawJson.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({ success: true, analysis: parsed });
  } catch (error) {
    console.error("Prescription parse error:", error);
    return NextResponse.json(
      { error: "Failed to analyse prescription." },
      { status: 500 },
    );
  }
}
