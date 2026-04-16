import Groq from 'groq-sdk'
import { NextResponse } from 'next/server'
import { getAILocale, aiLanguageInstruction } from '@/lib/aiLocale'

export const dynamic = 'force-dynamic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(request: Request) {
  try {
    const { memberContext, goal, memberName } = await request.json()
    const locale = await getAILocale()

    const prompt = `You are a certified Indian nutritionist. Based on the following health profile, create a personalised 7-day Indian diet chart.

HEALTH PROFILE:
${memberContext}

INSTRUCTIONS:
- Use traditional Indian foods (dal, roti, sabzi, rice, idli, dosa, poha, upma, etc.)
- Account for ALL allergies and chronic conditions mentioned
- Tailor meals specifically for the health goal: ${goal}
- Include practical portion sizes
- Vary meals across the 7 days — don't repeat the same meals
- Keep it realistic and affordable for an Indian family

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "goal": "${goal}",
  "memberName": "${memberName}",
  "summary": "2-3 sentence summary of the diet approach tailored to this person's conditions and goal",
  "weeklyPlan": [
    {
      "day": "Monday",
      "breakfast": "specific food items with portions",
      "midMorning": "specific snack",
      "lunch": "specific food items with portions",
      "eveningSnack": "specific snack",
      "dinner": "specific food items with portions",
      "notes": "one specific tip for this day related to their condition or goal"
    }
  ]
}
The weeklyPlan array must have exactly 7 items for Monday through Sunday.`

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt + aiLanguageInstruction(locale) }],
      temperature: 0.7,
    })

    const text = response.choices[0].message.content ?? ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Diet API error:', error)
    return NextResponse.json({ error: 'Failed to generate diet chart' }, { status: 500 })
  }
}