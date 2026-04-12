import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type MemberScore = {
  memberId: string;
  memberName: string;
  relation: string;
  score: number;
  breakdown: {
    insurance: number;
    medicines: number;
    records: number;
    budget: number;
    checkups: number;
  };
  insights: string[];
};

type FamilyHealthScore = {
  overall: number;
  band: "excellent" | "good" | "attention" | "risk";
  bandLabel: string;
  members: MemberScore[];
  familyInsights: string[];
  breakdown: {
    insurance: { score: number; max: number; label: string; detail: string };
    medicines: { score: number; max: number; label: string; detail: string };
    records: { score: number; max: number; label: string; detail: string };
    budget: { score: number; max: number; label: string; detail: string };
    checkups: { score: number; max: number; label: string; detail: string };
  };
};

function getBand(score: number): {
  band: "excellent" | "good" | "attention" | "risk";
  label: string;
} {
  if (score >= 80) return { band: "excellent", label: "Excellent" };
  if (score >= 60) return { band: "good", label: "Good" };
  if (score >= 40) return { band: "attention", label: "Needs Attention" };
  return { band: "risk", label: "At Risk" };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all data in parallel
    const [
      { data: members },
      { data: policies },
      { data: expenses },
      { data: medicines },
      { data: records },
    ] = await Promise.all([
      supabase.from("family_members").select("*").eq("user_id", user.id),
      supabase
        .from("insurance_policies")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase
        .from("medicines")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("health_records").select("*").eq("user_id", user.id),
    ]);

    const memberList = members ?? [];
    const policyList = policies ?? [];
    const expenseList = expenses ?? [];
    const medicineList = medicines ?? [];
    const recordList = records ?? [];

    if (memberList.length === 0) {
      return NextResponse.json({
        overall: 0,
        band: "risk",
        bandLabel: "No Data",
        members: [],
        familyInsights: ["Add family members to calculate your health score"],
        breakdown: {
          insurance: {
            score: 0,
            max: 20,
            label: "Insurance Coverage",
            detail: "No members added yet",
          },
          medicines: {
            score: 0,
            max: 20,
            label: "Medicine Adherence",
            detail: "No members added yet",
          },
          records: {
            score: 0,
            max: 20,
            label: "Health Records",
            detail: "No members added yet",
          },
          budget: {
            score: 0,
            max: 20,
            label: "Budget Management",
            detail: "No members added yet",
          },
          checkups: {
            score: 0,
            max: 20,
            label: "Preventive Checkups",
            detail: "No members added yet",
          },
        },
      });
    }

    // ── 1. INSURANCE SCORE (20 pts) ──────────────────────────
    const totalCover = policyList.reduce(
      (s, p) => s + Number(p.sum_insured),
      0,
    );
    const idealCoverPerMember = 500000; // ₹5L per member
    const idealTotal = idealCoverPerMember * memberList.length;
    const coverageRatio = Math.min(totalCover / idealTotal, 1);
    const insuranceScore = Math.round(coverageRatio * 20);
    const insuranceDetail =
      policyList.length === 0
        ? "No active insurance policies"
        : `₹${(totalCover / 100000).toFixed(1)}L cover for ${memberList.length} member${memberList.length > 1 ? "s" : ""}`;

    // ── 2. MEDICINE ADHERENCE SCORE (20 pts) ─────────────────
    const medsWithReminders = medicineList.filter(
      (m) => m.reminder_times?.length > 0,
    );
    const adherenceRatio =
      medicineList.length === 0
        ? 0.5
        : medsWithReminders.length / medicineList.length;
    const medicineScore = Math.round(adherenceRatio * 20);
    const medicineDetail =
      medicineList.length === 0
        ? "No active medicines tracked"
        : `${medsWithReminders.length} of ${medicineList.length} medicines have reminders set`;

    // ── 3. HEALTH RECORDS SCORE (20 pts) ─────────────────────
    const recordsPerMember =
      memberList.length > 0 ? recordList.length / memberList.length : 0;
    const idealRecordsPerMember = 3;
    const recordsRatio = Math.min(recordsPerMember / idealRecordsPerMember, 1);
    const recordsScore = Math.round(recordsRatio * 20);
    const recordsDetail =
      recordList.length === 0
        ? "No health records uploaded"
        : `${recordList.length} records for ${memberList.length} member${memberList.length > 1 ? "s" : ""}`;

    // ── 4. BUDGET MANAGEMENT SCORE (20 pts) ──────────────────
    const now = new Date();
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const recentExpenses = expenseList.filter(
      (e) => new Date(e.expense_date) >= last3Months,
    );
    const totalSpent = recentExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const coveredAmount = recentExpenses.reduce(
      (s, e) => s + Number(e.covered_amount),
      0,
    );
    const oopRatio =
      totalSpent > 0 ? (totalSpent - coveredAmount) / totalSpent : 0;
    // Lower OOP ratio = better score
    const budgetScore =
      totalSpent === 0 ? 10 : Math.round((1 - Math.min(oopRatio, 1)) * 20);
    const budgetDetail =
      totalSpent === 0
        ? "No expenses recorded in last 3 months"
        : `₹${((totalSpent - coveredAmount) / 1000).toFixed(1)}k out-of-pocket in last 3 months`;

    // ── 5. PREVENTIVE CHECKUPS SCORE (20 pts) ────────────────
    const preventiveCategories = ["Diagnostics", "Vaccination"];
    const preventiveExpenses = expenseList.filter((e) => {
      const cat = (e as any).category_name;
      return preventiveCategories.some((pc) => cat?.includes(pc));
    });
    // Check records for checkup-type records
    const checkupRecords = recordList.filter(
      (r) => r.record_type === "report" || r.record_type === "vaccination",
    );
    const checkupActivity = checkupRecords.length + preventiveExpenses.length;
    const idealCheckupActivity = memberList.length * 2;
    const checkupRatio = Math.min(
      checkupActivity / Math.max(idealCheckupActivity, 1),
      1,
    );
    const checkupsScore = Math.round(checkupRatio * 20);
    const checkupsDetail =
      checkupActivity === 0
        ? "No preventive checkups recorded"
        : `${checkupRecords.length} checkup records found`;

    // ── OVERALL SCORE ─────────────────────────────────────────
    const overall =
      insuranceScore +
      medicineScore +
      recordsScore +
      budgetScore +
      checkupsScore;
    const { band, label: bandLabel } = getBand(overall);

    // ── PER MEMBER SCORES ─────────────────────────────────────
    const memberScores: MemberScore[] = memberList.map((member) => {
      const memberRecords = recordList.filter((r) => r.member_id === member.id);
      const memberMeds = medicineList.filter((m) => m.member_id === member.id);
      const memberExpenses = expenseList.filter(
        (e) => e.member_id === member.id,
      );

      const mInsurance = policyList.length > 0 ? 20 : 0;
      const mMedicines =
        memberMeds.length === 0
          ? 10
          : Math.round(
              (memberMeds.filter((m) => m.reminder_times?.length > 0).length /
                memberMeds.length) *
                20,
            );
      const mRecords = Math.min(
        Math.round((memberRecords.length / 3) * 20),
        20,
      );
      const mSpent = memberExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const mCovered = memberExpenses.reduce(
        (s, e) => s + Number(e.covered_amount),
        0,
      );
      const mOOP = mSpent > 0 ? (mSpent - mCovered) / mSpent : 0;
      const mBudget =
        mSpent === 0 ? 10 : Math.round((1 - Math.min(mOOP, 1)) * 20);
      const mCheckups = Math.min(
        Math.round(
          (memberRecords.filter(
            (r) =>
              r.record_type === "report" || r.record_type === "vaccination",
          ).length /
            2) *
            20,
        ),
        20,
      );

      const mTotal = mInsurance + mMedicines + mRecords + mBudget + mCheckups;
      const insights: string[] = [];
      if (mInsurance === 0) insights.push("No insurance coverage");
      if (mRecords < 10) insights.push("Add more health records");
      if (mMedicines < 10) insights.push("Set medicine reminders");
      if (mBudget < 10) insights.push("High out-of-pocket spending");
      if (mCheckups < 10) insights.push("Schedule preventive checkups");

      return {
        memberId: member.id,
        memberName: member.name,
        relation: member.relation,
        score: mTotal,
        breakdown: {
          insurance: mInsurance,
          medicines: mMedicines,
          records: mRecords,
          budget: mBudget,
          checkups: mCheckups,
        },
        insights,
      };
    });

    // ── FAMILY INSIGHTS ───────────────────────────────────────
    const familyInsights: string[] = [];
    if (insuranceScore < 10)
      familyInsights.push(
        "Increase insurance coverage to at least ₹5L per member",
      );
    if (medicineScore < 10)
      familyInsights.push("Set medicine reminders to improve adherence");
    if (recordsScore < 10)
      familyInsights.push("Upload health records for all family members");
    if (budgetScore < 10)
      familyInsights.push(
        "High out-of-pocket spending — check insurance claims",
      );
    if (checkupsScore < 10)
      familyInsights.push("Schedule annual preventive checkups for the family");
    if (familyInsights.length === 0)
      familyInsights.push(
        "Great job! Your family health management is excellent.",
      );

    return NextResponse.json({
      overall,
      band,
      bandLabel,
      members: memberScores,
      familyInsights,
      breakdown: {
        insurance: {
          score: insuranceScore,
          max: 20,
          label: "Insurance Coverage",
          detail: insuranceDetail,
        },
        medicines: {
          score: medicineScore,
          max: 20,
          label: "Medicine Adherence",
          detail: medicineDetail,
        },
        records: {
          score: recordsScore,
          max: 20,
          label: "Health Records",
          detail: recordsDetail,
        },
        budget: {
          score: budgetScore,
          max: 20,
          label: "Budget Management",
          detail: budgetDetail,
        },
        checkups: {
          score: checkupsScore,
          max: 20,
          label: "Preventive Checkups",
          detail: checkupsDetail,
        },
      },
    });
  } catch (error) {
    console.error("Health score error:", error);
    return NextResponse.json(
      { error: "Failed to calculate health score" },
      { status: 500 },
    );
  }
}
