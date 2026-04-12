import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingDown,
  TrendingUp,
  Receipt,
  Users,
  Shield,
  AlertCircle,
  Target,
  Brain,
  Heart,
  Activity,
} from "lucide-react";
import SpendingChart from "@/components/dashboard/SpendingChart";
import CategoryChart from "@/components/dashboard/CategoryChart";

export const dynamic = "force-dynamic";

async function HealthScoreCard() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [
      { data: members },
      { data: policies },
      { data: medicines },
      { data: records },
    ] = await Promise.all([
      supabase.from("family_members").select("id").eq("user_id", user.id),
      supabase
        .from("insurance_policies")
        .select("sum_insured")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase
        .from("medicines")
        .select("id, reminder_times")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("health_records").select("id").eq("user_id", user.id),
    ]);

    const memberCount = members?.length ?? 0;
    if (memberCount === 0) return null;

    const totalCover =
      policies?.reduce((s, p) => s + Number(p.sum_insured), 0) ?? 0;
    const insuranceScore = Math.round(
      Math.min(totalCover / (500000 * memberCount), 1) * 20,
    );
    const medsWithReminders =
      medicines?.filter((m) => m.reminder_times?.length > 0).length ?? 0;
    const medicineScore =
      medicines?.length === 0
        ? 10
        : Math.round((medsWithReminders / (medicines?.length ?? 1)) * 20);
    const recordsScore = Math.min(
      Math.round(((records?.length ?? 0) / memberCount / 3) * 20),
      20,
    );
    const overall = insuranceScore + medicineScore + recordsScore + 10 + 10;

    const band =
      overall >= 80
        ? "excellent"
        : overall >= 60
          ? "good"
          : overall >= 40
            ? "attention"
            : "risk";
    const bandLabel =
      overall >= 80
        ? "Excellent"
        : overall >= 60
          ? "Good"
          : overall >= 40
            ? "Needs Attention"
            : "At Risk";
    const bandColor =
      overall >= 80
        ? "text-emerald-600 bg-emerald-50 border-emerald-200"
        : overall >= 60
          ? "text-blue-600 bg-blue-50 border-blue-200"
          : overall >= 40
            ? "text-amber-600 bg-amber-50 border-amber-200"
            : "text-red-600 bg-red-50 border-red-200";
    const barColor =
      overall >= 80
        ? "bg-emerald-500"
        : overall >= 60
          ? "bg-blue-500"
          : overall >= 40
            ? "bg-amber-500"
            : "bg-red-500";

    return (
      <div
        className={`rounded-2xl border p-5 mb-6 ${bandColor.split(" ").slice(1).join(" ")}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${bandColor}`}
            >
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">
                  Family Health Score
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${bandColor}`}
                >
                  {bandLabel}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-white/60 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${barColor}`}
                    style={{ width: `${overall}%` }}
                  />
                </div>
                <span
                  className={`text-sm font-bold ${bandColor.split(" ")[0]}`}
                >
                  {overall}/100
                </span>
              </div>
            </div>
          </div>
          <a
            href="/dashboard/health-score"
            className="btn-secondary text-sm flex items-center gap-2 shrink-0"
          >
            <Activity className="w-4 h-4" /> View details
          </a>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: expenses },
    { data: familyMembers },
    { data: policies },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, expense_categories(*), family_members(name, relation)")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .limit(200),
    supabase
      .from("family_members")
      .select("id, name, relation, annual_budget")
      .eq("user_id", user.id),
    supabase
      .from("insurance_policies")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  const now = new Date();

  const thisMonth =
    expenses?.filter((e) => {
      const d = new Date(e.expense_date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }) ?? [];

  const lastMonth =
    expenses?.filter((e) => {
      const d = new Date(e.expense_date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    }) ?? [];

  const totalThisMonth = thisMonth.reduce((s, e) => s + Number(e.amount), 0);
  const totalLastMonth = lastMonth.reduce((s, e) => s + Number(e.amount), 0);
  const totalOOP = thisMonth.reduce(
    (s, e) => s + (Number(e.amount) - Number(e.covered_amount)),
    0,
  );
  const totalCovered = thisMonth.reduce(
    (s, e) => s + Number(e.covered_amount),
    0,
  );
  const pctChange =
    totalLastMonth > 0
      ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
      : 0;
  const totalInsured =
    policies?.reduce((s, p) => s + Number(p.sum_insured), 0) ?? 0;

  const renewingSoon =
    policies?.filter((p) => {
      if (!p.renewal_date) return false;
      const days =
        (new Date(p.renewal_date).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24);
      return days <= 30 && days > 0;
    }) ?? [];

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  // ── Build last 6 months chart data ──────────────────────────
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const monthExpenses =
      expenses?.filter((e) => {
        const ed = new Date(e.expense_date);
        return (
          ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()
        );
      }) ?? [];
    const total = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const covered = monthExpenses.reduce(
      (s, e) => s + Number(e.covered_amount),
      0,
    );
    return {
      month: d.toLocaleString("en-IN", { month: "short" }),
      total,
      covered,
      outOfPocket: total - covered,
    };
  });

  // ── Build category breakdown ─────────────────────────────────
  const categoryMap: Record<
    string,
    { value: number; icon: string; color: string }
  > = {};
  expenses?.forEach((e) => {
    const cat = e.expense_categories as any;
    if (!cat) return;
    if (!categoryMap[cat.name]) {
      categoryMap[cat.name] = { value: 0, icon: cat.icon, color: cat.color };
    }
    categoryMap[cat.name].value += Number(e.amount);
  });
  const categoryData = Object.entries(categoryMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {firstName} 👋</h1>
          <p className="page-subtitle">
            Here's your family health spending overview
          </p>
        </div>
        <div className="text-sm text-muted-foreground bg-white border border-border rounded-xl px-4 py-2">
          {new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(
            new Date(),
          )}
        </div>
      </div>

      {renewingSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{renewingSoon[0].provider_name}</strong> renews in{" "}
            {Math.ceil(
              (new Date(renewingSoon[0].renewal_date!).getTime() -
                now.getTime()) /
                (1000 * 60 * 60 * 24),
            )}{" "}
            days.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card animate-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Month
            </span>
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(totalThisMonth)}
          </div>
          <div
            className={`flex items-center gap-1 mt-1 text-xs font-medium ${pctChange <= 0 ? "text-emerald-600" : "text-red-500"}`}
          >
            {pctChange <= 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
            {Math.abs(pctChange).toFixed(0)}% vs last month
          </div>
        </div>

        <div className="stat-card animate-in delay-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Out of Pocket
            </span>
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(totalOOP)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatCurrency(totalCovered)} covered
          </div>
        </div>

        <div className="stat-card animate-in delay-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Family Members
            </span>
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-semibold">
            {familyMembers?.length ?? 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {thisMonth.length} expenses this month
          </div>
        </div>

        <div className="stat-card animate-in delay-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Insured Cover
            </span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-semibold">
            {formatCurrency(totalInsured)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {policies?.length ?? 0} active{" "}
            {policies?.length === 1 ? "policy" : "policies"}
          </div>
        </div>
      </div>

      {/* Should I? quick access card */}
      <div className="bg-gradient-to-r from-primary/10 to-emerald-50 border border-primary/20 rounded-2xl p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              Not sure if a procedure is worth it?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get a personalised recommendation using your insurance, budget &
              live prices
            </p>
          </div>
        </div>
        <a
          href="/dashboard/advisor"
          className="btn-primary shrink-0 flex items-center gap-2 text-sm"
        >
          <Brain className="w-4 h-4" />
          Ask now
        </a>
      </div>

      {/* Health Score quick card */}
      <HealthScoreCard />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-sm">Monthly Spending</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last 6 months — covered vs out of pocket
            </p>
          </div>
          <SpendingChart data={monthlyData} />
        </div>

        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-sm">By Category</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              All-time spending breakdown
            </p>
          </div>
          <CategoryChart data={categoryData} />
        </div>
      </div>

      {/* Budget tracker */}
      {familyMembers && familyMembers.some((m: any) => m.annual_budget) && (
        <div className="bg-white rounded-2xl border border-border p-6 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Annual health budgets</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Yearly spending vs target per member
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {familyMembers
              .filter((m: any) => m.annual_budget)
              .map((member: any) => {
                const memberExpenses =
                  expenses?.filter((e) => e.member_id === member.id) ?? [];
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const yearlySpend = memberExpenses
                  .filter((e) => new Date(e.expense_date) >= yearStart)
                  .reduce((s: number, e: any) => s + Number(e.amount), 0);
                const pct = Math.min(
                  100,
                  Math.round((yearlySpend / member.annual_budget) * 100),
                );
                const remaining = member.annual_budget - yearlySpend;
                const isOver = yearlySpend > member.annual_budget;
                const isWarning = pct >= 80 && !isOver;

                return (
                  <div key={member.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white text-xs font-semibold">
                          {member.name[0]}
                        </div>
                        <span className="text-sm font-medium">
                          {member.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">
                          {formatCurrency(yearlySpend)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          / {formatCurrency(member.annual_budget)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOver
                            ? "bg-red-500"
                            : isWarning
                              ? "bg-amber-500"
                              : "bg-primary"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs text-muted-foreground">
                        {pct}% used
                      </span>
                      <span
                        className={`text-xs font-medium ${isOver ? "text-red-600" : isWarning ? "text-amber-600" : "text-muted-foreground"}`}
                      >
                        {isOver
                          ? `${formatCurrency(Math.abs(remaining))} over budget`
                          : `${formatCurrency(remaining)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-sm">Recent expenses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions
            </p>
          </div>
          <a
            href="/dashboard/expenses"
            className="text-xs text-primary font-medium hover:underline"
          >
            View all →
          </a>
        </div>
        {expenses && expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.slice(0, 8).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-sm">
                    {(expense.expense_categories as any)?.icon ?? "📋"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {expense.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(expense.family_members as any)?.name ?? "Unknown"} ·{" "}
                      {expense.expense_date}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold">
                  {formatCurrency(Number(expense.amount))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No expenses yet. Add your first one!</p>
            <a
              href="/dashboard/expenses"
              className="btn-primary mt-4 inline-flex"
            >
              Add expense
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
