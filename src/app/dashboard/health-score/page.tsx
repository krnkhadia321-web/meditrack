"use client";

import { useEffect, useState } from "react";
import {
  Heart,
  Shield,
  Pill,
  FileText,
  TrendingDown,
  Activity,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Breakdown = {
  score: number;
  max: number;
  label: string;
  detail: string;
};

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

type HealthScore = {
  overall: number;
  band: "excellent" | "good" | "attention" | "risk";
  bandLabel: string;
  members: MemberScore[];
  familyInsights: string[];
  breakdown: Record<string, Breakdown>;
};

const BAND_COLORS = {
  excellent: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    ring: "text-emerald-500",
    score: "text-emerald-600",
  },
  good: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    ring: "text-blue-500",
    score: "text-blue-600",
  },
  attention: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    ring: "text-amber-500",
    score: "text-amber-600",
  },
  risk: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    ring: "text-red-500",
    score: "text-red-600",
  },
};

const BAND_ICONS = {
  excellent: "🟢",
  good: "🔵",
  attention: "🟠",
  risk: "🔴",
};

const CATEGORY_ICONS: Record<string, any> = {
  insurance: Shield,
  medicines: Pill,
  records: FileText,
  budget: TrendingDown,
  checkups: Activity,
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "#10b981"
      : score >= 60
        ? "#3b82f6"
        : score >= 40
          ? "#f59e0b"
          : "#ef4444";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
      <text
        x="50"
        y="45"
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        fill={color}
      >
        {score}
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="10" fill="#9ca3af">
        /100
      </text>
    </svg>
  );
}

function ProgressBar({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color =
    pct >= 80
      ? "bg-emerald-500"
      : pct >= 60
        ? "bg-blue-500"
        : pct >= 40
          ? "bg-amber-500"
          : "bg-red-500";
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function HealthScorePage() {
  const [data, setData] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health-score")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setExpandedMember(d.members?.[0]?.memberId ?? null);
      })
      .catch(() => setError("Failed to load health score"))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );

  if (error || !data)
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="text-sm text-red-700">
          {error || "Could not load health score"}
        </p>
      </div>
    );

  const colors = BAND_COLORS[data.band];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            Family Health Score
          </h1>
          <p className="page-subtitle">
            A comprehensive view of your family's health management
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetch("/api/health-score")
              .then((r) => r.json())
              .then((d) => setData(d))
              .finally(() => setLoading(false));
          }}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <Activity className="w-4 h-4" /> Recalculate
        </button>
      </div>

      {/* Overall score card */}
      <div
        className={`rounded-2xl border p-6 mb-6 ${colors.bg} ${colors.border}`}
      >
        <div className="flex items-center gap-6">
          <ScoreRing score={data.overall} size={120} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{BAND_ICONS[data.band]}</span>
              <span className={`text-xl font-bold ${colors.score}`}>
                {data.bandLabel}
              </span>
            </div>
            <p className={`text-sm ${colors.text} mb-4`}>
              Your family scored <strong>{data.overall}/100</strong> on health
              management
            </p>
            <div className="space-y-1.5">
              {data.familyInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  {data.band === "excellent" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle
                      className={`w-4 h-4 ${colors.ring} shrink-0 mt-0.5`}
                    />
                  )}
                  <span className={`text-sm ${colors.text}`}>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-semibold text-sm mb-5">Score Breakdown</h2>
        <div className="space-y-4">
          {Object.entries(data.breakdown).map(([key, item]) => {
            const Icon = CATEGORY_ICONS[key] ?? Activity;
            const pct = Math.round((item.score / item.max) * 100);
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                    <span className="text-sm font-semibold w-12 text-right">
                      {item.score}/{item.max}
                    </span>
                  </div>
                </div>
                <ProgressBar score={item.score} max={item.max} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Per member scores */}
      {data.members.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3">Per Member Breakdown</h2>
          <div className="space-y-3">
            {data.members.map((member) => {
              const mColors = BAND_COLORS[getBand(member.score)];
              return (
                <div
                  key={member.memberId}
                  className="bg-white rounded-2xl border border-border overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedMember(
                        expandedMember === member.memberId
                          ? null
                          : member.memberId,
                      )
                    }
                    className="w-full flex items-center gap-4 p-5 hover:bg-muted/20 transition-colors"
                  >
                    <ScoreRing score={member.score} size={60} />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-sm">
                        {member.memberName}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize mt-0.5">
                        {member.relation}
                      </div>
                      {member.insights.length > 0 && (
                        <div className="text-xs text-amber-600 mt-1">
                          {member.insights[0]}
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-semibold ${mColors.score}`}>
                      {member.score}/100
                    </div>
                    {expandedMember === member.memberId ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedMember === member.memberId && (
                    <div className="border-t border-border p-5">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                        {Object.entries(member.breakdown).map(
                          ([key, score]) => {
                            const Icon = CATEGORY_ICONS[key] ?? Activity;
                            return (
                              <div
                                key={key}
                                className="bg-muted/30 rounded-xl p-3 text-center"
                              >
                                <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                                <div className="text-lg font-bold">{score}</div>
                                <div className="text-[10px] text-muted-foreground capitalize">
                                  {key}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                      {member.insights.length > 0 && (
                        <div className="space-y-1.5">
                          {member.insights.map((insight, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm text-amber-700"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              {insight}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getBand(score: number): "excellent" | "good" | "attention" | "risk" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "attention";
  return "risk";
}
