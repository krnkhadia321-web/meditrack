import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

type MemberScore = {
  memberId: string;
  memberName: string;
  relation: string;
  age: number | null;
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

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function monthsAgo(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

function calcInsuranceScore(
  age: number | null,
  hasPolicy: boolean,
  totalCover: number,
  chronicConditions: string | null,
): { score: number; insight: string | null } {
  if (!hasPolicy) return { score: 0, insight: "No active insurance policy" };

  const hasChronicCondition = !!(
    chronicConditions && chronicConditions.trim().length > 0
  );
  const isSenior = age !== null && age >= 60;
  const isChild = age !== null && age < 18;

  // Ideal cover thresholds
  const idealCover = isSenior ? 1000000 : isChild ? 300000 : 500000;
  const extraNeeded = hasChronicCondition ? idealCover * 1.5 : idealCover;

  const basePts = 10; // just having a policy
  const coverPts = Math.min(Math.round((totalCover / extraNeeded) * 10), 10);
  const score = Math.min(basePts + coverPts, 20);

  const insight =
    score < 15
      ? `Insurance cover of ₹${(totalCover / 100000).toFixed(1)}L is below recommended ₹${(extraNeeded / 100000).toFixed(0)}L`
      : null;

  return { score, insight };
}

function calcMedicineScore(
  age: number | null,
  chronicConditions: string | null,
  memberMeds: any[],
): { score: number; insight: string | null } {
  const hasChronicCondition = !!(
    chronicConditions && chronicConditions.trim().length > 0
  );

  if (memberMeds.length === 0) {
    // No medicines tracked
    if (hasChronicCondition) {
      return {
        score: 5,
        insight: "Has chronic conditions but no medicines tracked",
      };
    }
    return { score: 15, insight: null }; // healthy baseline
  }

  const medsWithReminders = memberMeds.filter(
    (m) => m.reminder_times?.length > 0,
  );
  const reminderRatio = medsWithReminders.length / memberMeds.length;

  // Check for critically low refills
  const criticalRefills = memberMeds.filter((m) => {
    if (!m.remaining_quantity || !m.times_per_day) return false;
    const daysLeft = Math.floor(m.remaining_quantity / m.times_per_day);
    return daysLeft <= 3;
  });

  let score = Math.round(reminderRatio * 20);
  score = Math.max(score - criticalRefills.length * 5, 0); // penalty for critical refills
  score = Math.min(score, 20);

  const insight =
    criticalRefills.length > 0
      ? `${criticalRefills.length} medicine${criticalRefills.length > 1 ? "s" : ""} need urgent refill`
      : reminderRatio < 0.5
        ? "Set reminders for all medicines to improve adherence"
        : null;

  return { score, insight };
}

function calcRecordsScore(
  age: number | null,
  memberRecords: any[],
): { score: number; insight: string | null } {
  if (memberRecords.length === 0) {
    return { score: 0, insight: "No health records uploaded" };
  }

  const isSenior = age !== null && age >= 60;

  // Score records based on recency
  let totalPoints = 0;
  memberRecords.forEach((r) => {
    const months = monthsAgo(r.record_date);
    if (months <= 6) totalPoints += 10;
    else if (months <= 12) totalPoints += 5;
    else totalPoints += 2;
  });

  // Normalise — seniors need more frequent records
  const idealPoints = isSenior ? 30 : 20;
  const score = Math.min(Math.round((totalPoints / idealPoints) * 20), 20);

  const oldRecords = memberRecords.filter((r) => monthsAgo(r.record_date) > 12);
  const insight =
    score < 10
      ? oldRecords.length === memberRecords.length
        ? "All records are over 1 year old — upload recent ones"
        : "Add more recent health records"
      : null;

  return { score, insight };
}

function calcBudgetScore(
  age: number | null,
  memberExpenses: any[],
): { score: number; insight: string | null } {
  if (memberExpenses.length === 0) return { score: 10, insight: null };

  const isSenior = age !== null && age >= 60;

  const now = new Date();
  const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const recent = memberExpenses.filter(
    (e) => new Date(e.expense_date) >= last3Months,
  );

  const totalSpent = recent.reduce(
    (s: number, e: any) => s + Number(e.amount),
    0,
  );
  const covered = recent.reduce(
    (s: number, e: any) => s + Number(e.covered_amount),
    0,
  );
  const oopRatio = totalSpent > 0 ? (totalSpent - covered) / totalSpent : 0;

  // Seniors have higher expected spending — be more lenient
  const threshold = isSenior ? 0.7 : 0.5;
  const score =
    totalSpent === 0
      ? 10
      : Math.round((1 - Math.min(oopRatio / threshold, 1)) * 20);

  const insight =
    oopRatio > threshold
      ? `High out-of-pocket spending — check if insurance claims are being filed`
      : null;

  return { score: Math.max(score, 0), insight };
}

function calcCheckupsScore(
  age: number | null,
  memberRecords: any[],
): { score: number; insight: string | null } {
  const isSenior = age !== null && age >= 60;
  const isChild = age !== null && age < 18;

  const vaccinationRecords = memberRecords.filter(
    (r) => r.record_type === "vaccination",
  );
  const reportRecords = memberRecords.filter((r) => r.record_type === "report");

  // Most recent records
  const latestVaccination =
    vaccinationRecords.length > 0
      ? Math.min(...vaccinationRecords.map((r) => monthsAgo(r.record_date)))
      : null;
  const latestReport =
    reportRecords.length > 0
      ? Math.min(...reportRecords.map((r) => monthsAgo(r.record_date)))
      : null;

  let score = 0;
  let insight = null;

  // Vaccination score (up to 8 pts)
  if (latestVaccination !== null) {
    const maxMonths = isChild ? 12 : 24;
    score += Math.max(Math.round((1 - latestVaccination / maxMonths) * 8), 0);
  }

  // Report/checkup score (up to 12 pts)
  if (latestReport !== null) {
    const maxMonths = isSenior ? 6 : 12;
    score += Math.max(Math.round((1 - latestReport / maxMonths) * 12), 0);
  }

  score = Math.min(score, 20);

  if (isSenior && (latestReport === null || latestReport > 6)) {
    insight = "Seniors should have checkups every 6 months";
  } else if (latestReport === null && latestVaccination === null) {
    insight = "No preventive checkups or vaccinations recorded";
  } else if (latestReport !== null && latestReport > 12) {
    insight = "Last checkup was over 12 months ago";
  }

  return { score, insight };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const totalCover = policyList.reduce(
      (s, p) => s + Number(p.sum_insured),
      0,
    );

    // Per member scores
    const memberScores: MemberScore[] = memberList.map((member) => {
      const age = getAge(member.date_of_birth);
      const memberMeds = medicineList.filter((m) => m.member_id === member.id);
      const memberExpenses = expenseList.filter(
        (e) => e.member_id === member.id,
      );
      const memberRecords = recordList.filter((r) => r.member_id === member.id);

      const ins = calcInsuranceScore(
        age,
        policyList.length > 0,
        totalCover / memberList.length,
        member.chronic_conditions,
      );
      const med = calcMedicineScore(age, member.chronic_conditions, memberMeds);
      const rec = calcRecordsScore(age, memberRecords);
      const bud = calcBudgetScore(age, memberExpenses);
      const chk = calcCheckupsScore(age, memberRecords);

      const total = ins.score + med.score + rec.score + bud.score + chk.score;
      const insights = [
        ins.insight,
        med.insight,
        rec.insight,
        bud.insight,
        chk.insight,
      ].filter(Boolean) as string[];

      return {
        memberId: member.id,
        memberName: member.name,
        relation: member.relation,
        age,
        score: total,
        breakdown: {
          insurance: ins.score,
          medicines: med.score,
          records: rec.score,
          budget: bud.score,
          checkups: chk.score,
        },
        insights,
      };
    });

    // Family overall = average of member scores
    const overall = Math.round(
      memberScores.reduce((s, m) => s + m.score, 0) / memberScores.length,
    );
    const { band, label: bandLabel } = getBand(overall);

    // Family-level breakdown = average across members
    const avgBreakdown = (key: keyof MemberScore["breakdown"]) =>
      Math.round(
        memberScores.reduce((s, m) => s + m.breakdown[key], 0) /
          memberScores.length,
      );

    const insuranceAvg = avgBreakdown("insurance");
    const medicinesAvg = avgBreakdown("medicines");
    const recordsAvg = avgBreakdown("records");
    const budgetAvg = avgBreakdown("budget");
    const checkupsAvg = avgBreakdown("checkups");

    // Family insights
    const familyInsights: string[] = [];
    if (insuranceAvg < 10)
      familyInsights.push(
        "Increase insurance coverage — target ₹5L+ per member",
      );
    if (medicinesAvg < 10)
      familyInsights.push("Set medicine reminders and check refill levels");
    if (recordsAvg < 10)
      familyInsights.push("Upload recent health records for all members");
    if (budgetAvg < 10)
      familyInsights.push(
        "High out-of-pocket costs — file insurance claims regularly",
      );
    if (checkupsAvg < 10)
      familyInsights.push("Schedule annual preventive checkups for the family");
    if (familyInsights.length === 0)
      familyInsights.push("Excellent health management! Keep it up.");

    const worstMember = memberScores.reduce((a, b) =>
      a.score < b.score ? a : b,
    );
    if (worstMember.score < 50) {
      familyInsights.unshift(
        `${worstMember.memberName} needs the most attention (score: ${worstMember.score}/100)`,
      );
    }

    return NextResponse.json({
      overall,
      band,
      bandLabel,
      members: memberScores,
      familyInsights,
      breakdown: {
        insurance: {
          score: insuranceAvg,
          max: 20,
          label: "Insurance Coverage",
          detail: `₹${(totalCover / 100000).toFixed(1)}L total cover for ${memberList.length} members`,
        },
        medicines: {
          score: medicinesAvg,
          max: 20,
          label: "Medicine Adherence",
          detail: `${medicineList.length} active medicines tracked`,
        },
        records: {
          score: recordsAvg,
          max: 20,
          label: "Health Records",
          detail: `${recordList.length} records across ${memberList.length} members`,
        },
        budget: {
          score: budgetAvg,
          max: 20,
          label: "Budget Management",
          detail: `Based on last 3 months spending`,
        },
        checkups: {
          score: checkupsAvg,
          max: 20,
          label: "Preventive Checkups",
          detail: `Based on recency of reports and vaccinations`,
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
