import { createClient } from '@/lib/supabase/server'

export type ToolName =
  | 'search_hospital_prices'
  | 'suggest_generic_medicines'
  | 'check_scheme_eligibility'
  | 'get_spending_summary'
  | 'log_expense'
  | 'compare_hospitals'

export const toolDefinitions = [
  {
    name: 'search_hospital_prices',
    description:
      'Search for current prices of medical procedures, consultations, or treatments at hospitals in a specific city in India. Use this when user asks about cost of any medical service.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The medical service or procedure to search for' },
        city: { type: 'string', description: 'City in India to search in' },
      },
      required: ['query', 'city'],
    },
  },
  {
    name: 'suggest_generic_medicines',
    description:
      'Suggest cheaper generic alternatives for brand-name medicines prescribed to a patient. Returns generic name, estimated price difference and where to buy.',
    input_schema: {
      type: 'object',
      properties: {
        medicines: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of brand-name medicines to find generics for',
        },
      },
      required: ['medicines'],
    },
  },
  {
    name: 'check_scheme_eligibility',
    description:
      'Check which Indian government health schemes (PMJAY, CGHS, ESIC, state schemes) a user may be eligible for based on their profile.',
    input_schema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'Indian state the user lives in' },
        annual_income: { type: 'string', description: 'Annual household income in INR' },
        employment_type: {
          type: 'string',
          enum: ['government', 'private', 'self-employed', 'unemployed'],
          description: 'Type of employment',
        },
        family_size: { type: 'string', description: 'Number of family members' },
      },
      required: ['state'],
    },
  },
  {
    name: 'get_spending_summary',
    description:
      'Get a summary of the user\'s healthcare spending from their MediTrack records. Use when user asks about their expenses, spending patterns or history.',
    input_schema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['this_month', 'last_month', 'last_3_months', 'this_year', 'all_time'],
          description: 'Time period for the summary',
        },
        member_name: {
          type: 'string',
          description: 'Optional: filter by family member name',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'log_expense',
    description:
      'Log a new medical expense to the user\'s MediTrack records when they mention spending money on healthcare.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Description of the expense' },
        amount: { type: 'string', description: 'Total amount in INR' },
        covered_amount: { type: 'string', description: 'Amount covered by insurance if any' },
        hospital_name: { type: 'string', description: 'Name of hospital or clinic' },
        category: {
          type: 'string',
          enum: ['Consultation', 'Medicines', 'Diagnostics', 'Surgery', 'Physiotherapy', 'Dental', 'Vision', 'Mental Health', 'Vaccination', 'Other'],
          description: 'Category of expense',
        },
        expense_date: { type: 'string', description: 'Date in YYYY-MM-DD format, default today' },
      },
      required: ['description', 'amount'],
    },
  },
  {
    name: 'compare_hospitals',
    description:
      'Compare two or more hospitals or diagnostic centers for a specific procedure or treatment in terms of price, quality and reviews.',
    input_schema: {
      type: 'object',
      properties: {
        hospitals: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of hospital names to compare',
        },
        procedure: { type: 'string', description: 'Medical procedure or treatment to compare' },
        city: { type: 'string', description: 'City in India' },
      },
      required: ['hospitals', 'procedure'],
    },
  },
]

// ── Tool execution functions ──────────────────────────────────

export async function executeTool(
  toolName: ToolName,
  toolInput: Record<string, any>,
  userId: string
): Promise<string> {
  switch (toolName) {
    case 'search_hospital_prices':
      return await searchHospitalPrices(toolInput.query, toolInput.city)

    case 'suggest_generic_medicines':
      return await suggestGenericMedicines(toolInput.medicines)

    case 'check_scheme_eligibility':
      return checkSchemeEligibility(toolInput)

    case 'get_spending_summary':
      return await getSpendingSummary(userId, toolInput.period, toolInput.member_name)

    case 'log_expense':
      return await logExpense(userId, toolInput)

    case 'compare_hospitals':
      return await compareHospitals(toolInput.hospitals, toolInput.procedure, toolInput.city)

    default:
      return 'Tool not found'
  }
}

async function searchHospitalPrices(query: string, city: string): Promise<string> {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${query} cost price ${city} India hospital 2024`,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    })
    const data = await res.json()
    const results = data.results?.slice(0, 3).map((r: any) =>
      `• ${r.title}: ${r.content?.slice(0, 200)}`
    ).join('\n')
    return `Search results for "${query}" in ${city}:\n\n${data.answer ?? ''}\n\n${results}`
  } catch {
    return `Could not fetch live prices for ${query} in ${city}. Based on general knowledge, ${query} in Indian hospitals typically costs between ₹500–₹5,000 depending on the hospital tier.`
  }
}

async function suggestGenericMedicines(medicines: string[]): Promise<string> {
  const suggestions = medicines.map(med => {
    const genericMap: Record<string, { generic: string; savings: string; note: string }> = {
      'crocin': { generic: 'Paracetamol 500mg', savings: '60-70%', note: 'Available at any pharmacy' },
      'dolo': { generic: 'Paracetamol 650mg', savings: '50-60%', note: 'Jan Aushadhi stores' },
      'augmentin': { generic: 'Amoxicillin + Clavulanic Acid', savings: '40-60%', note: 'Prescription required' },
      'pantoprazole': { generic: 'Pantoprazole IP', savings: '70-80%', note: 'Jan Aushadhi stores' },
      'ecosprin': { generic: 'Aspirin 75mg', savings: '50-65%', note: 'Available everywhere' },
      'telma': { generic: 'Telmisartan 40mg', savings: '60-75%', note: 'Jan Aushadhi stores' },
      'glycomet': { generic: 'Metformin 500mg', savings: '65-75%', note: 'Jan Aushadhi stores' },
    }
    const key = med.toLowerCase().replace(/\s+/g, '')
    const match = Object.keys(genericMap).find(k => key.includes(k))
    if (match) {
      const s = genericMap[match]
      return `• ${med} → Generic: ${s.generic} | Savings: ${s.savings} | Where: ${s.note}`
    }
    return `• ${med} → Ask your pharmacist for the generic (salt) equivalent. Jan Aushadhi stores offer 50-90% savings on most medicines.`
  })

  return `Generic medicine alternatives:\n\n${suggestions.join('\n')}\n\n💡 Tip: Visit your nearest Pradhan Mantri Jan Aushadhi Kendra for the cheapest generics. Use the PMJAK app to find the nearest store.`
}

function checkSchemeEligibility(input: Record<string, any>): string {
  input.annual_income = input.annual_income ? Number(input.annual_income) : undefined
  input.family_size = input.family_size ? Number(input.family_size) : undefined
  const schemes = []

  // PMJAY - Ayushman Bharat
  if (!input.annual_income || input.annual_income < 500000) {
    schemes.push({
      name: 'Ayushman Bharat PM-JAY',
      benefit: 'Up to ₹5 lakh/year coverage per family',
      eligibility: 'BPL families & SECC database listed households',
      apply: 'pmjay.gov.in or nearest Common Service Centre',
    })
  }

  // CGHS
  if (input.employment_type === 'government') {
    schemes.push({
      name: 'Central Government Health Scheme (CGHS)',
      benefit: 'Comprehensive healthcare for govt employees & pensioners',
      eligibility: 'Central government employees and their dependents',
      apply: 'cghs.gov.in',
    })
  }

  // ESIC
  if (input.employment_type === 'private') {
    schemes.push({
      name: 'ESIC (Employees State Insurance)',
      benefit: 'Full medical coverage + sick pay',
      eligibility: 'Private employees earning under ₹21,000/month',
      apply: 'esic.in',
    })
  }

  // State schemes
  const stateSchemes: Record<string, string> = {
    'maharashtra': 'Mahatma Jyotiba Phule Jan Arogya Yojana — ₹1.5L coverage',
    'karnataka': 'Arogyasri — ₹1.5L coverage for BPL families',
    'andhra pradesh': 'YSR Aarogyasri — ₹5L coverage',
    'tamil nadu': 'Chief Minister\'s Comprehensive Health Insurance — ₹5L',
    'rajasthan': 'Mukhyamantri Chiranjeevi Yojana — ₹25L coverage',
    'west bengal': 'Swasthya Sathi — ₹5L coverage',
    'delhi': 'Delhi Arogya Kosh — financial assistance for serious illness',
    'gujarat': 'MA Vatsalya Yojana — ₹5L coverage',
    'uttar pradesh': 'Mukhyamantri Jan Arogya Yojana',
    'haryana': 'Chirayu Haryana — ₹5L coverage',
  }

  const stateKey = input.state?.toLowerCase()
  if (stateKey && stateSchemes[stateKey]) {
    schemes.push({
      name: `${input.state} State Scheme`,
      benefit: stateSchemes[stateKey],
      eligibility: 'State residents — check state portal for income criteria',
      apply: `${stateKey.replace(' ', '')}health.gov.in`,
    })
  }

  if (schemes.length === 0) {
    return 'Based on the information provided, you may not qualify for most subsidized schemes, but consider a private health insurance plan. Popular options: Star Health, HDFC Ergo, Niva Bupa.'
  }

  const result = schemes.map(s =>
    `📋 ${s.name}\n   Benefit: ${s.benefit}\n   Eligibility: ${s.eligibility}\n   Apply: ${s.apply}`
  ).join('\n\n')

  return `You may be eligible for these schemes:\n\n${result}\n\n💡 Tip: Apply for Ayushman Bharat card immediately at your nearest CSC — it's free and covers most hospitalizations.`
}

async function getSpendingSummary(
  userId: string,
  period: string,
  memberName?: string
): Promise<string> {
  try {
    const supabase = await createClient()
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break
      case 'last_month': startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); break
      case 'last_3_months': startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1); break
      case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); break
      default: startDate = new Date('2000-01-01')
    }

    let query = supabase
      .from('expenses')
      .select('*, expense_categories(name), family_members(name)')
      .eq('user_id', userId)
      .gte('expense_date', startDate.toISOString().split('T')[0])

    const { data: expenses } = await query

    if (!expenses || expenses.length === 0) {
      return `No expenses found for ${period.replace('_', ' ')}.`
    }

    const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const oop = expenses.reduce((s, e) => s + (Number(e.amount) - Number(e.covered_amount)), 0)
    const covered = total - oop

    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      const cat = (e.expense_categories as any)?.name ?? 'Other'
      acc[cat] = (acc[cat] ?? 0) + Number(e.amount)
      return acc
    }, {})

    const topCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, amt]) => `  • ${cat}: ₹${amt.toLocaleString('en-IN')}`)
      .join('\n')

    return `Spending summary for ${period.replace(/_/g, ' ')}:

💰 Total spent: ₹${total.toLocaleString('en-IN')}
🏥 Out of pocket: ₹${oop.toLocaleString('en-IN')}
🛡️ Covered by insurance: ₹${covered.toLocaleString('en-IN')}
📊 Number of expenses: ${expenses.length}

Top categories:
${topCategories}`
  } catch {
    return 'Could not fetch spending data. Please try again.'
  }
}

async function logExpense(userId: string, input: Record<string, any>): Promise<string> {
  try {
    // Coerce types and fix date
    input.amount = Number(input.amount)
    input.covered_amount = input.covered_amount ? Number(input.covered_amount) : 0
    if (!input.expense_date || input.expense_date === 'today') {
      input.expense_date = new Date().toISOString().split('T')[0]
    }

    const supabase = await createClient()
   

    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id, name')

    const category = categories?.find(c =>
      c.name.toLowerCase() === (input.category ?? '').toLowerCase()
    )

    await supabase.from('expenses').insert({
      user_id: userId,
      description: input.description,
      amount: input.amount,
      covered_amount: input.covered_amount ?? 0,
      hospital_name: input.hospital_name ?? null,
      category_id: category?.id ?? null,
      expense_date: input.expense_date ?? new Date().toISOString().split('T')[0],
    })

    return `✅ Expense logged successfully!\n• ${input.description}\n• Amount: ₹${Number(input.amount).toLocaleString('en-IN')}\n• Date: ${input.expense_date ?? 'today'}`
  } catch {
    return 'Could not log expense. Please add it manually in the Expenses section.'
  }
}

async function compareHospitals(
  hospitals: string[],
  procedure: string,
  city?: string
): Promise<string> {
  try {
    const searchQuery = `compare ${hospitals.join(' vs ')} ${procedure} price ${city ?? 'India'}`
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: searchQuery,
        search_depth: 'basic',
        max_results: 4,
        include_answer: true,
      }),
    })
    const data = await res.json()
    return `Hospital comparison for ${procedure}:\n\n${data.answer ?? 'No direct comparison found.'}\n\n💡 Tip: Always call the hospital billing department directly to confirm current prices before booking.`
  } catch {
    return `Could not fetch live comparison data. Generally: Corporate hospitals (Apollo, Fortis, Max) charge 2-3x more than government hospitals for the same procedure. Consider CGHS-empanelled hospitals for significant savings.`
  }
}