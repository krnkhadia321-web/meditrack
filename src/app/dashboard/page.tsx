import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp, Receipt, Users, Shield, AlertCircle } from 'lucide-react'
import SpendingChart from '@/components/dashboard/SpendingChart'
import CategoryChart from '@/components/dashboard/CategoryChart'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: expenses },
    { data: familyMembers },
    { data: policies },
    { data: profile },
  ] = await Promise.all([
    supabase.from('expenses').select('*, expense_categories(*), family_members(name, relation)')
      .eq('user_id', user.id).order('expense_date', { ascending: false }).limit(200),
    supabase.from('family_members').select('*').eq('user_id', user.id),
    supabase.from('insurance_policies').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  const now = new Date()

  const thisMonth = expenses?.filter(e => {
    const d = new Date(e.expense_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }) ?? []

  const lastMonth = expenses?.filter(e => {
    const d = new Date(e.expense_date)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  }) ?? []

  const totalThisMonth = thisMonth.reduce((s, e) => s + Number(e.amount), 0)
  const totalLastMonth = lastMonth.reduce((s, e) => s + Number(e.amount), 0)
  const totalOOP = thisMonth.reduce((s, e) => s + (Number(e.amount) - Number(e.covered_amount)), 0)
  const totalCovered = thisMonth.reduce((s, e) => s + Number(e.covered_amount), 0)
  const pctChange = totalLastMonth > 0
    ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100 : 0
  const totalInsured = policies?.reduce((s, p) => s + Number(p.sum_insured), 0) ?? 0

  const renewingSoon = policies?.filter(p => {
    if (!p.renewal_date) return false
    const days = (new Date(p.renewal_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return days <= 30 && days > 0
  }) ?? []

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // ── Build last 6 months chart data ──────────────────────────
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthExpenses = expenses?.filter(e => {
      const ed = new Date(e.expense_date)
      return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()
    }) ?? []
    const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0)
    const covered = monthExpenses.reduce((s, e) => s + Number(e.covered_amount), 0)
    return {
      month: d.toLocaleString('en-IN', { month: 'short' }),
      total,
      covered,
      outOfPocket: total - covered,
    }
  })

  // ── Build category breakdown ─────────────────────────────────
  const categoryMap: Record<string, { value: number; icon: string; color: string }> = {}
  expenses?.forEach(e => {
    const cat = (e.expense_categories as any)
    if (!cat) return
    if (!categoryMap[cat.name]) {
      categoryMap[cat.name] = { value: 0, icon: cat.icon, color: cat.color }
    }
    categoryMap[cat.name].value += Number(e.amount)
  })
  const categoryData = Object.entries(categoryMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {firstName} 👋</h1>
          <p className="page-subtitle">Here's your family health spending overview</p>
        </div>
        <div className="text-sm text-muted-foreground bg-white border border-border rounded-xl px-4 py-2">
          {new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' }).format(new Date())}
        </div>
      </div>

      {renewingSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{renewingSoon[0].provider_name}</strong> renews in{' '}
            {Math.ceil((new Date(renewingSoon[0].renewal_date!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card animate-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Month</span>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(totalThisMonth)}</div>
          <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${pctChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {pctChange <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            {Math.abs(pctChange).toFixed(0)}% vs last month
          </div>
        </div>

        <div className="stat-card animate-in delay-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Out of Pocket</span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(totalOOP)}</div>
          <div className="text-xs text-muted-foreground mt-1">{formatCurrency(totalCovered)} covered</div>
        </div>

        <div className="stat-card animate-in delay-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Family Members</span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{familyMembers?.length ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">{thisMonth.length} expenses this month</div>
        </div>

        <div className="stat-card animate-in delay-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insured Cover</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-semibold">{formatCurrency(totalInsured)}</div>
          <div className="text-xs text-muted-foreground mt-1">{policies?.length ?? 0} active {policies?.length === 1 ? 'policy' : 'policies'}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-sm">Monthly Spending</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months — covered vs out of pocket</p>
          </div>
          <SpendingChart data={monthlyData} />
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-sm">By Category</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All-time spending breakdown</p>
          </div>
          <CategoryChart data={categoryData} />
        </div>
      </div>

      {/* Recent expenses */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-sm">Recent expenses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest transactions</p>
          </div>
          <a href="/dashboard/expenses" className="text-xs text-primary font-medium hover:underline">View all →</a>
        </div>
        {expenses && expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.slice(0, 8).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm">
                    {(expense.expense_categories as any)?.icon ?? '📋'}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{expense.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {(expense.family_members as any)?.name ?? 'Unknown'} · {expense.expense_date}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(Number(expense.amount))}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No expenses yet. Add your first one!</p>
            <a href="/dashboard/expenses" className="btn-primary mt-4 inline-flex">Add expense</a>
          </div>
        )}
      </div>
    </div>
  )
}