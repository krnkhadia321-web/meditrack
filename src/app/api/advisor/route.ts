import Groq from 'groq-sdk'
import { createClient } from '@/lib/supabase/server'
import { getAILocale, aiLanguageInstruction } from '@/lib/aiLocale'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const ADVISOR_SYSTEM_PROMPT = `You are MediTrack's Pre-Decision Advisor — India's smartest healthcare financial advisor. 

When a user asks "Should I do X procedure/test/surgery?", you:
1. ALWAYS call the pre_decision_advisor tool first to get their real data
2. Give a clear, specific, actionable recommendation
3. Show the cheapest realistic option first
4. Be direct — say "Yes, do it at X" or "Wait, here's a cheaper option"
5. Format currency as ₹ (Indian Rupees)
6. Never show reasoning steps or chain of thought
7. Keep the final response concise and structured`

const advisorTool = {
  type: 'function' as const,
  function: {
    name: 'pre_decision_advisor',
    description: 'Analyse whether a user should proceed with a medical procedure. Fetches their insurance, budget, live prices, and government scheme options to give a personalised recommendation.',
    parameters: {
      type: 'object',
      properties: {
        procedure: {
          type: 'string',
          description: 'The medical procedure, test, or treatment being considered',
        },
        quoted_price: {
  type: 'string',
  description: 'The price quoted to the user in INR as a number, if any',
},
        quoted_hospital: {
          type: 'string',
          description: 'The hospital or diagnostic centre that gave the quote',
        },
        city: {
          type: 'string',
          description: 'City where the user is located',
        },
        member_name: {
          type: 'string',
          description: 'Family member who needs the procedure, if mentioned',
        },
      },
      required: ['procedure'],
    },
  },
}

const CITY_PROXIMITY: Record<string, { nearby: string[]; distances: string[] }> = {
  'gurugram': { nearby: ['Delhi', 'Noida', 'Faridabad', 'Ghaziabad'], distances: ['~15 km', '~45 km', '~25 km', '~50 km'] },
  'gurgaon': { nearby: ['Delhi', 'Noida', 'Faridabad', 'Ghaziabad'], distances: ['~15 km', '~45 km', '~25 km', '~50 km'] },
  'delhi': { nearby: ['Noida', 'Gurugram', 'Faridabad', 'Ghaziabad'], distances: ['~25 km', '~15 km', '~30 km', '~20 km'] },
  'noida': { nearby: ['Delhi', 'Ghaziabad', 'Gurugram', 'Faridabad'], distances: ['~25 km', '~15 km', '~45 km', '~40 km'] },
  'mumbai': { nearby: ['Thane', 'Navi Mumbai', 'Pune', 'Kalyan'], distances: ['~35 km', '~20 km', '~150 km', '~55 km'] },
  'bangalore': { nearby: ['Mysore', 'Hosur', 'Tumkur', 'Chennai'], distances: ['~145 km', '~40 km', '~70 km', '~345 km'] },
  'hyderabad': { nearby: ['Secunderabad', 'Warangal', 'Vijayawada', 'Pune'], distances: ['~10 km', '~145 km', '~270 km', '~560 km'] },
  'chennai': { nearby: ['Vellore', 'Pondicherry', 'Bangalore', 'Coimbatore'], distances: ['~135 km', '~150 km', '~345 km', '~500 km'] },
  'kolkata': { nearby: ['Howrah', 'Durgapur', 'Asansol', 'Bhubaneswar'], distances: ['~10 km', '~165 km', '~200 km', '~440 km'] },
  'pune': { nearby: ['Mumbai', 'Nashik', 'Aurangabad', 'Solapur'], distances: ['~150 km', '~210 km', '~235 km', '~245 km'] },
  'ahmedabad': { nearby: ['Gandhinagar', 'Vadodara', 'Surat', 'Rajkot'], distances: ['~30 km', '~100 km', '~265 km', '~215 km'] },
  'jaipur': { nearby: ['Ajmer', 'Alwar', 'Delhi', 'Jodhpur'], distances: ['~135 km', '~150 km', '~270 km', '~335 km'] },
}

function getNearbyContext(city: string): string {
  const key = city.toLowerCase().trim()
  const match = CITY_PROXIMITY[key]
  if (!match) return ''
  return `If no options in ${city}, nearest cities in order: ${match.nearby.map((c, i) => `${c} (${match.distances[i]})`).join(', ')}`
}

async function runAdvisorTool(
  input: Record<string, any>,
  userId: string,
  userCity: string
): Promise<string> {
  const { procedure, quoted_price, quoted_hospital, city, member_name } = input
  const price = quoted_price ? Number(quoted_price) : null
  // Groq sometimes passes empty strings — treat those as missing and fall back to profile city.
  const searchCity = (typeof city === 'string' && city.trim()) || userCity || 'India'

  // 1. Fetch user's insurance
  const supabase = await createClient()
  const { data: policies } = await supabase
    .from('insurance_policies')
    .select('provider_name, sum_insured, plan_name, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)

  // 2. Fetch user's spending this month for budget context
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const { data: monthExpenses } = await supabase
    .from('expenses')
    .select('amount')
    .eq('user_id', userId)
    .gte('expense_date', monthStart)

  const monthTotal = monthExpenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0

  // 3. Fetch family member context if mentioned
  let memberContext = ''
  if (member_name) {
    const { data: members } = await supabase
      .from('family_members')
      .select('name, chronic_conditions, allergies, blood_group')
      .eq('user_id', userId)
      .ilike('name', `%${member_name}%`)
      .limit(1)
    if (members && members.length > 0) {
      const m = members[0]
      memberContext = `Member: ${m.name}, Conditions: ${m.chronic_conditions ?? 'None'}, Allergies: ${m.allergies ?? 'None'}`
    }
  }

  // 4. Live price search via Tavily
  let priceData = ''
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${procedure} cost price ${searchCity} India hospital 2025 cheap affordable`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    })
    const data = await res.json()
    const snippets = data.results
      ?.slice(0, 3)
      .map((r: any) => `• ${r.title}: ${r.content?.slice(0, 150)}`)
      .join('\n')
    priceData = `Live price data:\n${data.answer ?? ''}\n${snippets ?? ''}`
  } catch {
    priceData = `No live price data available. Based on general knowledge, ${procedure} in Indian hospitals typically costs ₹500–₹50,000 depending on the city and hospital tier.`
  }

// 5. Affordable specific hospitals/centers — search 1
let affordableOptions = ''
try {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `cheapest ${procedure} price list diagnostic centre hospital ${searchCity}`,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })
  const data = await res.json()
  const snippets = data.results
    ?.slice(0, 4)
    .map((r: any) => `• ${r.title}: ${r.content?.slice(0, 150)}`)
    .join('\n')
  affordableOptions = `${data.answer ?? ''}\n${snippets ?? ''}`
} catch {
  affordableOptions = ''
}

// 5b. Second search — named hospitals with prices
let namedHospitals = ''
try {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${procedure} cost Apollo Fortis Max Manipal government hospital ${searchCity} price 2024 2025`,
      search_depth: 'basic',
      max_results: 5,
      include_answer: true,
    }),
  })
  const data = await res.json()
  const snippets = data.results
    ?.slice(0, 4)
    .map((r: any) => `• ${r.title}: ${r.content?.slice(0, 150)}`)
    .join('\n')
  namedHospitals = `${data.answer ?? ''}\n${snippets ?? ''}`
} catch {
  namedHospitals = ''
}

  // 6. Government hospital search
  let govOptions = ''
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${procedure} government hospital CGHS PMJAY free cheap ${searchCity}`,
        search_depth: 'basic',
        max_results: 3,
        include_answer: true,
      }),
    })
    const data = await res.json()
    govOptions = data.answer ?? 'Government options may be available — check PMJAY empanelled hospitals in your city.'
  } catch {
    govOptions = 'Check PMJAY empanelled hospitals for subsidised rates.'
  }

  // 7. MediTrack crowdsourced data — real prices reported by verified users
  let crowdsourcedData = ''
  try {
    const { data: prices } = await supabase.rpc('get_price_intelligence', {
      p_city: searchCity,
      p_category: null,
      // Only narrow by hospital name if the user quoted a specific hospital.
      // Otherwise return all hospitals in the city so the model can pick relevant ones.
      p_search: quoted_hospital || null,
    })
    if (prices && prices.length > 0) {
      crowdsourcedData = prices.slice(0, 8).map((p: any) =>
        `• ${p.hospital} (${p.category}): ₹${Number(p.min_price).toLocaleString('en-IN')}–₹${Number(p.max_price).toLocaleString('en-IN')} · median ₹${Number(p.median_price).toLocaleString('en-IN')} · based on ${p.sample_count} real reports`
      ).join('\n')
    }
  } catch {}

  // Build structured response
  const insuranceSummary = policies && policies.length > 0
    ? policies.map(p => `${p.provider_name} (${p.plan_name ?? 'Policy'}): ₹${Number(p.sum_insured).toLocaleString('en-IN')} cover`).join(', ')
    : 'No active insurance found'

  return `DECISION DATA FOR: ${procedure}${quoted_hospital ? ` at ${quoted_hospital}` : ''}
${price ? `Quoted price: ₹${price.toLocaleString('en-IN')}` : ''}
City: ${searchCity}
${memberContext ? memberContext : ''}

INSURANCE:
${insuranceSummary}

THIS MONTH'S SPENDING: ₹${monthTotal.toLocaleString('en-IN')}

MEDITRACK USER REPORTS:
Real prices reported by verified MediTrack users in ${searchCity}. These are the most trustworthy data points — prefer these over article search snippets when they exist.
${crowdsourcedData || 'Not enough crowdsourced data yet for this procedure in this city.'}

LIVE MARKET PRICES:
${priceData}

AFFORDABLE OPTIONS DATA FOR ${searchCity.toUpperCase()}:
${affordableOptions}

NAMED HOSPITALS WITH PRICES IN ${searchCity.toUpperCase()}:
${namedHospitals}

NEARBY CITIES IF SAME-CITY OPTIONS ARE UNAVAILABLE:
${getNearbyContext(searchCity)}

GOVERNMENT / SUBSIDISED OPTIONS:
${govOptions}

Use all this data to give a specific, personalised recommendation. Structure your response EXACTLY like this:

**Verdict:** Is the quoted price fair, high, or low?

**Options in ${searchCity} — cheapest to most expensive:**
1. [Hospital/Centre name] — ₹[price] (budget option)
2. [Hospital/Centre name] — ₹[price]
3. [Hospital/Centre name] — ₹[price]
4. [Hospital/Centre name] — ₹[price]
5. [Hospital/Centre name] — ₹[price] (premium option)

If you don't have 5 real names from the search data, fill the remaining slots using your knowledge of well-known hospitals and diagnostic chains in ${searchCity} (e.g. Practo-listed labs, SRL Diagnostics, Dr Lal PathLabs, Thyrocare, government hospitals). NEVER leave fewer than 4 options. NEVER mention hospitals outside ${searchCity}.

**Insurance:** Does their policy cover this?
**Government option:** Is PMJAY or a govt hospital viable?
**My recommendation:** One clear sentence on what to do.`
}

export async function POST(request: Request) {
  try {
    const { query, city } = await request.json()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, city')
      .eq('id', user.id)
      .single()

    const userCity = city ?? profile?.city ?? null

// If city provided in request, save it to profile for future use
if (city && city !== profile?.city) {
  await supabase.from('profiles').update({ city }).eq('id', user.id)
}

if (!userCity) {
  return NextResponse.json({ error: 'CITY_REQUIRED' }, { status: 200 })
}

    const messages: any[] = [
      { role: 'user', content: query },
    ]

    const locale = await getAILocale()
    const systemPrompt = ADVISOR_SYSTEM_PROMPT + aiLanguageInstruction(locale)

    // First call — let Groq decide to use the tool
    let response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      tools: [advisorTool],
      tool_choice: 'required',
    })

    let toolData = ''

    // Execute tool if called
    if (response.choices[0].finish_reason === 'tool_calls') {
      const assistantMsg = response.choices[0].message
      const toolCall = assistantMsg.tool_calls?.[0]

      if (toolCall) {
        const toolInput = JSON.parse(toolCall.function.arguments)
        toolData = await runAdvisorTool(toolInput, user.id, userCity)

        messages.push(assistantMsg)
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolData,
        })

        // Final response
        response = await groq.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 1500,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          tools: [advisorTool],
          tool_choice: 'none',
        })
      }
    }

    const finalText = response.choices[0].message.content ?? ''

    return NextResponse.json({
      text: finalText,
      procedureData: toolData ? parseToolData(toolData) : null,
    })
  } catch (error) {
    console.error('Advisor API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

function parseToolData(raw: string): Record<string, string> {
  const sections: Record<string, string> = {}
  const lines = raw.split('\n')
  let currentSection = ''
  let buffer: string[] = []

  for (const line of lines) {
    if (line.match(/^[A-Z\s\/]+:$/) || line.match(/^DECISION DATA FOR:/)) {
      if (currentSection && buffer.length) {
        sections[currentSection] = buffer.join('\n').trim()
      }
      currentSection = line.replace(':', '').trim()
      buffer = []
    } else if (currentSection) {
      buffer.push(line)
    }
  }
  if (currentSection && buffer.length) {
    sections[currentSection] = buffer.join('\n').trim()
  }
  return sections
}