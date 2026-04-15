import type { SupabaseClient } from '@supabase/supabase-js'

// ── Vital status (mirrors src/app/dashboard/vitals/page.tsx) ───────────────────
const VITAL_RANGES: Record<string, { min: number; max: number; min2?: number; max2?: number; label: string; icon: string }> = {
  blood_pressure: { min: 90,  max: 140, min2: 60, max2: 90, label: 'Blood Pressure', icon: '🫀' },
  blood_sugar:    { min: 70,  max: 140,                      label: 'Blood Sugar',    icon: '🩸' },
  weight:         { min: 0,   max: 999,                      label: 'Weight',         icon: '⚖️' },
  spo2:           { min: 95,  max: 100,                      label: 'SpO2',           icon: '🫁' },
  heart_rate:     { min: 60,  max: 100,                      label: 'Heart Rate',     icon: '💓' },
  temperature:    { min: 97,  max: 99,                       label: 'Temperature',    icon: '🌡️' },
}

export function vitalStatus(type: string, value: number, value2?: number | null): 'Normal' | 'Watch' | 'Alert' {
  const cfg = VITAL_RANGES[type]
  if (!cfg) return 'Normal'
  const out1 = value < cfg.min || value > cfg.max
  const out2 = value2 != null && cfg.min2 !== undefined ? (value2 < cfg.min2 || value2 > (cfg.max2 ?? cfg.min2)) : false
  if (!out1 && !out2) return 'Normal'
  const severe = value < cfg.min * 0.85 || value > cfg.max * 1.15
  return severe ? 'Alert' : 'Watch'
}

export function vitalLabel(type: string): string { return VITAL_RANGES[type]?.label ?? type }
export function vitalIcon(type: string): string { return VITAL_RANGES[type]?.icon ?? '📊' }

// ── 80D calculation (extracted from TaxCalculator.tsx) ─────────────────────────
const PREVENTIVE_CATEGORIES = ['diagnostics', 'vaccination']

export type Tax80D = {
  insurancePremium: number
  preventiveCheckups: number
  seniorCitizenPremium: number
  total80D: number
  selfLimit: number
  seniorLimit: number
  maxDeduction: number
  estimatedSaving20: number
  estimatedSaving30: number
  utilisationPct: number
  eligibleExpenses: Array<{ date: string; description: string; amount: number; type: string }>
}

export function calculate80D(
  policies: any[] | null | undefined,
  expenses: any[] | null | undefined,
  hasSenior: boolean,
): Tax80D {
  const insurancePremium = policies
    ?.filter(p => !p.is_senior)
    ?.reduce((s, p) => s + Number(p.premium_annual ?? 0), 0) ?? 0

  const preventiveExpenses = expenses?.filter(e => {
    const catName = (e.expense_categories as any)?.name?.toLowerCase() ?? ''
    return PREVENTIVE_CATEGORIES.some(c => catName.includes(c))
  }) ?? []
  const preventiveTotal = preventiveExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const preventiveCheckups = Math.min(preventiveTotal, 5000)

  const selfLimit = 25000
  const seniorLimit = hasSenior ? 50000 : 0
  const selfDeductible = Math.min(insurancePremium + preventiveCheckups, selfLimit)
  const seniorCitizenPremium = hasSenior ? 50000 : 0
  const total80D = selfDeductible + seniorLimit
  const maxDeduction = selfLimit + (hasSenior ? 50000 : 0)

  const eligibleExpenses = [
    ...(policies?.map(p => ({
      date: (p.created_at ?? '').split('T')[0],
      description: `${p.provider_name} — ${p.plan_name ?? 'Health Insurance'}`,
      amount: Number(p.premium_annual ?? 0),
      type: 'Insurance premium',
    })) ?? []),
    ...preventiveExpenses.map(e => ({
      date: e.expense_date,
      description: e.description,
      amount: Number(e.amount),
      type: 'Preventive checkup',
    })),
  ]

  return {
    insurancePremium,
    preventiveCheckups,
    seniorCitizenPremium,
    total80D,
    selfLimit,
    seniorLimit,
    maxDeduction,
    estimatedSaving20: Math.round(total80D * 0.20),
    estimatedSaving30: Math.round(total80D * 0.30),
    utilisationPct: Math.min(100, Math.round((total80D / maxDeduction) * 100)),
    eligibleExpenses,
  }
}

// ── FY helpers ─────────────────────────────────────────────────────────────────
export function currentFYStartYear(now = new Date()): number {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
}

export function fyBounds(startYear: number) {
  return {
    start: new Date(startYear, 3, 1),
    end: new Date(startYear + 1, 2, 31),
    label: `FY ${startYear}–${String(startYear + 1).slice(2)}`,
  }
}

// ── Report types ───────────────────────────────────────────────────────────────
export type ReportMode = 'monthly' | 'annual'

type Summary = {
  total: number
  covered: number
  outOfPocket: number
  expenseCount: number
  vsPrevious: { pct: number; delta: number; previousTotal: number } | null
}

type CategoryRow = { name: string; icon: string; color: string; amount: number; pct: number }
type MemberRow   = { id: string; name: string; relation: string; spent: number; budget: number | null; budgetPct: number | null }
type ExpenseRow  = { date: string; description: string; memberName: string; hospital: string | null; amount: number; covered: number; oop: number; category: string }
type PolicyRow   = { provider: string; plan: string | null; sumInsured: number; premium: number | null; renewalDate: string | null; policyNumber: string | null }
type MedRow      = { memberName: string; name: string; generic: string | null; dosage: string; frequency: string; refillStatus: 'OK' | 'Low' | 'Unknown' }
type VitalRow    = { memberName: string; type: string; label: string; icon: string; latest: string; status: 'Normal' | 'Watch' | 'Alert'; loggedAt: string }

export type ReportData = {
  mode: ReportMode
  period: { label: string; startDate: string; endDate: string }
  user: { fullName: string; email: string; city: string | null }
  summary: Summary
  categories: CategoryRow[]
  perMember: MemberRow[]
  topExpenses: ExpenseRow[]
  insurance: { policies: PolicyRow[]; totalCover: number; totalPremium: number }
  tax80D: Tax80D | null
  health: { medicines: MedRow[]; vitals: VitalRow[] }
  savings: {
    insuranceClaimedPct: number
    genericSwapsEstimate: number
    budgetAdherence: Array<{ memberName: string; withinBudget: boolean; pct: number | null }>
  }
  generatedAt: string
}

// Local-date YYYY-MM-DD (no UTC conversion — Supabase `date` columns are timezone-agnostic)
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ── Main entry ─────────────────────────────────────────────────────────────────
export async function getReportData(
  supabase: SupabaseClient,
  userId: string,
  mode: ReportMode,
  periodKey: { year: number; month?: number; fyStartYear?: number },
  hasSenior: boolean = false,
): Promise<ReportData> {
  // Resolve period bounds
  let start: Date, end: Date, label: string
  if (mode === 'monthly') {
    const { year, month } = periodKey
    if (month === undefined) throw new Error('month required for monthly mode')
    start = new Date(year, month, 1)
    end   = new Date(year, month + 1, 0)
    label = start.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  } else {
    const fyStart = periodKey.fyStartYear ?? currentFYStartYear()
    const b = fyBounds(fyStart)
    start = b.start; end = b.end; label = b.label
  }

  const startISO = ymd(start)
  const endISO   = ymd(end)

  // Previous period (for monthly delta)
  const prevStart = mode === 'monthly' ? new Date(start.getFullYear(), start.getMonth() - 1, 1) : null
  const prevEnd   = mode === 'monthly' ? new Date(start.getFullYear(), start.getMonth(), 0) : null

  // Parallel fetch
  const [profileRes, expensesRes, prevExpensesRes, policiesRes, membersRes, medicinesRes, vitalsRes] = await Promise.all([
    supabase.from('profiles').select('full_name, city').eq('id', userId).single(),
    supabase.from('expenses')
      .select('*, expense_categories(name, icon, color), family_members(id, name, relation, annual_budget)')
      .eq('user_id', userId)
      .gte('expense_date', startISO)
      .lte('expense_date', endISO),
    prevStart
      ? supabase.from('expenses').select('amount')
          .eq('user_id', userId)
          .gte('expense_date', ymd(prevStart))
          .lte('expense_date', ymd(prevEnd!))
      : Promise.resolve({ data: [] as any[] }),
    // Policies that existed during the period (added on or before period end)
    supabase.from('insurance_policies')
      .select('*')
      .eq('user_id', userId)
      .lte('created_at', endISO + 'T23:59:59'),
    supabase.from('family_members').select('*').eq('user_id', userId),
    // Medicines that overlap the period: started by period end AND (no end OR ended after period start)
    supabase.from('medicines')
      .select('*, family_members(name)')
      .eq('user_id', userId)
      .lte('start_date', endISO)
      .or(`end_date.is.null,end_date.gte.${startISO}`),
    // Vitals logged within the period
    supabase.from('vitals')
      .select('*, family_members(name)')
      .eq('user_id', userId)
      .gte('logged_at', startISO)
      .lte('logged_at', endISO + 'T23:59:59')
      .order('logged_at', { ascending: false }),
  ])

  const profile = profileRes.data
  const expenses = expensesRes.data ?? []
  const prevExpenses = prevExpensesRes.data ?? []
  const policies = policiesRes.data ?? []
  const members = membersRes.data ?? []
  const medicines = medicinesRes.data ?? []
  const vitals = vitalsRes.data ?? []

  // Summary
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const covered = expenses.reduce((s, e) => s + Number(e.covered_amount), 0)
  const oop = total - covered
  const prevTotal = prevExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
  const vsPrevious = mode === 'monthly'
    ? {
        previousTotal: prevTotal,
        delta: total - prevTotal,
        pct: prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0,
      }
    : null

  // Categories
  const catMap: Record<string, CategoryRow> = {}
  expenses.forEach(e => {
    const cat = (e.expense_categories as any)
    if (!cat) return
    if (!catMap[cat.name]) catMap[cat.name] = { name: cat.name, icon: cat.icon ?? '📋', color: cat.color ?? '#888', amount: 0, pct: 0 }
    catMap[cat.name].amount += Number(e.amount)
  })
  const categories = Object.values(catMap)
    .sort((a, b) => b.amount - a.amount)
    .map(c => ({ ...c, pct: total > 0 ? Math.round((c.amount / total) * 100) : 0 }))

  // Per-member
  const memberSpend: Record<string, number> = {}
  expenses.forEach(e => {
    const m = (e.family_members as any)
    if (!m) return
    memberSpend[m.id] = (memberSpend[m.id] ?? 0) + Number(e.amount)
  })
  const perMember: MemberRow[] = members.map(m => {
    const spent = memberSpend[m.id] ?? 0
    const budget = m.annual_budget ? Number(m.annual_budget) : null
    // Scale budget for monthly mode (budget is annual → /12 for monthly comparison)
    const scaled = budget !== null
      ? (mode === 'monthly' ? budget / 12 : budget)
      : null
    return {
      id: m.id,
      name: m.name,
      relation: m.relation,
      spent,
      budget: scaled,
      budgetPct: scaled && scaled > 0 ? Math.round((spent / scaled) * 100) : null,
    }
  }).sort((a, b) => b.spent - a.spent)

  // Top expenses
  const topExpenses: ExpenseRow[] = [...expenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10)
    .map(e => ({
      date: e.expense_date,
      description: e.description,
      memberName: (e.family_members as any)?.name ?? '—',
      hospital: e.hospital_name ?? null,
      amount: Number(e.amount),
      covered: Number(e.covered_amount),
      oop: Number(e.amount) - Number(e.covered_amount),
      category: (e.expense_categories as any)?.name ?? 'Other',
    }))

  // Insurance
  const activePolicies = policies.filter(p => p.is_active)
  const insurance = {
    policies: activePolicies.map(p => ({
      provider: p.provider_name,
      plan: p.plan_name,
      sumInsured: Number(p.sum_insured),
      premium: p.premium_annual ? Number(p.premium_annual) : null,
      renewalDate: p.renewal_date,
      policyNumber: p.policy_number,
    })),
    totalCover: activePolicies.reduce((s, p) => s + Number(p.sum_insured), 0),
    totalPremium: activePolicies.reduce((s, p) => s + Number(p.premium_annual ?? 0), 0),
  }

  // 80D (annual only — we compute for the report's FY)
  let tax80D: Tax80D | null = null
  if (mode === 'annual') {
    tax80D = calculate80D(policies, expenses, hasSenior)
  }

  // Medicines
  const medRows: MedRow[] = medicines.map(m => {
    let refill: 'OK' | 'Low' | 'Unknown' = 'Unknown'
    if (m.remaining_quantity != null && m.refill_alert_at != null) {
      refill = Number(m.remaining_quantity) <= Number(m.refill_alert_at) ? 'Low' : 'OK'
    }
    return {
      memberName: (m.family_members as any)?.name ?? '—',
      name: m.name,
      generic: m.generic_name ?? null,
      dosage: m.dosage,
      frequency: m.frequency,
      refillStatus: refill,
    }
  })

  // Latest vital per (member, type)
  const latestVitals: Record<string, any> = {}
  vitals.forEach((v: any) => {
    const mid = v.member_id
    const key = `${mid}::${v.type}`
    if (!latestVitals[key]) latestVitals[key] = v
  })
  const vitalRows: VitalRow[] = Object.values(latestVitals).map((v: any) => {
    const value = Number(v.value)
    const value2 = v.value2 != null ? Number(v.value2) : null
    const latest = v.type === 'blood_pressure' && value2 ? `${value}/${value2} ${v.unit}` : `${value} ${v.unit}`
    return {
      memberName: (v.family_members as any)?.name ?? '—',
      type: v.type,
      label: vitalLabel(v.type),
      icon: vitalIcon(v.type),
      latest,
      status: vitalStatus(v.type, value, value2),
      loggedAt: v.logged_at,
    }
  })

  // Savings
  const insuranceClaimedPct = total > 0 ? Math.round((covered / total) * 100) : 0
  const medicinesCount = expenses.filter(e => {
    const catName = (e.expense_categories as any)?.name?.toLowerCase() ?? ''
    return catName.includes('medicine')
  }).length
  // Rough estimate: assume 30% of brand medicine spend could have been saved via generics
  const medicineSpend = expenses
    .filter(e => ((e.expense_categories as any)?.name ?? '').toLowerCase().includes('medicine'))
    .reduce((s, e) => s + Number(e.amount), 0)
  const genericSwapsEstimate = Math.round(medicineSpend * 0.3)

  const budgetAdherence = perMember
    .filter(m => m.budget !== null)
    .map(m => ({
      memberName: m.name,
      withinBudget: (m.budgetPct ?? 0) <= 100,
      pct: m.budgetPct,
    }))

  return {
    mode,
    period: { label, startDate: startISO, endDate: endISO },
    user: {
      fullName: profile?.full_name ?? 'MediTrack User',
      email: '',
      city: profile?.city ?? null,
    },
    summary: { total, covered, outOfPocket: oop, expenseCount: expenses.length, vsPrevious },
    categories,
    perMember,
    topExpenses,
    insurance,
    tax80D,
    health: { medicines: medRows, vitals: vitalRows },
    savings: { insuranceClaimedPct, genericSwapsEstimate, budgetAdherence },
    generatedAt: new Date().toISOString(),
  }
}
