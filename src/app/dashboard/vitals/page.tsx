"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FamilyMember } from "@/types";
import {
  Activity,
  Plus,
  X,
  Loader2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Vital = {
  id: string;
  member_id: string;
  type: string;
  value: number;
  value2: number | null;
  unit: string;
  logged_at: string;
  notes: string | null;
};

type VitalConfig = {
  label: string;
  unit: string;
  unit2?: string;
  placeholder: string;
  placeholder2?: string;
  normalMin: number;
  normalMax: number;
  normalMin2?: number;
  normalMax2?: number;
  color: string;
  icon: string;
  description: string;
};

const VITAL_CONFIGS: Record<string, VitalConfig> = {
  blood_pressure: {
    label: "Blood Pressure",
    unit: "mmHg",
    placeholder: "Systolic (e.g. 120)",
    placeholder2: "Diastolic (e.g. 80)",
    normalMin: 90,
    normalMax: 140,
    normalMin2: 60,
    normalMax2: 90,
    color: "#E24B4A",
    icon: "🫀",
    description: "Normal: 90–140 / 60–90 mmHg",
  },
  blood_sugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    placeholder: "e.g. 95 (fasting)",
    normalMin: 70,
    normalMax: 140,
    color: "#BA7517",
    icon: "🩸",
    description: "Fasting normal: 70–100 mg/dL",
  },
  weight: {
    label: "Weight",
    unit: "kg",
    placeholder: "e.g. 72.5",
    normalMin: 0,
    normalMax: 999,
    color: "#1D9E75",
    icon: "⚖️",
    description: "Track your weight over time",
  },
  spo2: {
    label: "SpO2 (Oxygen)",
    unit: "%",
    placeholder: "e.g. 98",
    normalMin: 95,
    normalMax: 100,
    color: "#185FA5",
    icon: "🫁",
    description: "Normal: 95–100%",
  },
  heart_rate: {
    label: "Heart Rate",
    unit: "bpm",
    placeholder: "e.g. 72",
    normalMin: 60,
    normalMax: 100,
    color: "#993556",
    icon: "💓",
    description: "Normal resting: 60–100 bpm",
  },
  temperature: {
    label: "Temperature",
    unit: "°F",
    placeholder: "e.g. 98.6",
    normalMin: 97,
    normalMax: 99,
    color: "#D85A30",
    icon: "🌡️",
    description: "Normal: 97–99°F",
  },
};

function getStatus(
  type: string,
  value: number,
  value2?: number | null,
): "normal" | "warning" | "critical" {
  const cfg = VITAL_CONFIGS[type];
  if (!cfg) return "normal";
  const outOfRange = value < cfg.normalMin || value > cfg.normalMax;
  const outOfRange2 =
    value2 !== null && value2 !== undefined && cfg.normalMin2 !== undefined
      ? value2 < cfg.normalMin2! || value2 > cfg.normalMax2!
      : false;
  if (!outOfRange && !outOfRange2) return "normal";
  const severelyOut =
    value < cfg.normalMin * 0.85 || value > cfg.normalMax * 1.15;
  return severelyOut ? "critical" : "warning";
}

function formatValue(v: Vital): string {
  if (v.type === "blood_pressure" && v.value2)
    return `${v.value}/${v.value2} ${v.unit}`;
  return `${v.value} ${v.unit}`;
}

function getTrend(vitals: Vital[]): "up" | "down" | "stable" {
  if (vitals.length < 2) return "stable";
  const last = Number(vitals[0].value);
  const prev = Number(vitals[1].value);
  const diff = ((last - prev) / prev) * 100;
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "stable";
}

export default function VitalsPage() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedType, setSelectedType] = useState("blood_pressure");
  const [activeChart, setActiveChart] = useState("blood_pressure");
  const supabase = createClient();
  const [scanningVitals, setScanningVitals] = useState(false);
  const [showScanReview, setShowScanReview] = useState(false);
  const [scannedReadings, setScannedReadings] = useState<any[]>([]);
  const [scannedSource, setScannedSource] = useState("");
  const vitalsFileRef = useRef<HTMLInputElement>(null);

  const emptyForm = {
    member_id: "",
    type: "blood_pressure",
    value: "",
    value2: "",
    notes: "",
    logged_at: new Date().toISOString().slice(0, 16),
  };
  const [form, setForm] = useState(emptyForm);

  async function fetchData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: v }, { data: m }] = await Promise.all([
      supabase
        .from("vitals")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(200),
      supabase.from("family_members").select("*").eq("user_id", user.id),
    ]);
    setVitals(v ?? []);
    setMembers(m ?? []);
    if (m && m.length > 0 && !selectedMember) setSelectedMember(m[0].id);
    setLoading(false);
  }

  async function handleScanVitals(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanningVitals(true);
    setScannedReadings([]);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const {
        data: { text },
      } = await Tesseract.recognize(file, "eng", { logger: () => {} });
      if (!text || text.trim().length < 5)
        throw new Error(
          "Could not read the image. Please try a clearer photo.",
        );
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, type: "vitals" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.extracted.readings?.length)
        throw new Error("No vital readings found in this image.");
      setScannedReadings(data.extracted.readings);
      setScannedSource(data.extracted.source ?? "");
      setShowScanReview(true);
    } catch (err: any) {
      alert(err.message ?? "Failed to scan vitals.");
    } finally {
      setScanningVitals(false);
      if (vitalsFileRef.current) vitalsFileRef.current.value = "";
    }
  }

  async function handleSaveScannedVitals() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !selectedMember) {
      alert("Please select a family member first.");
      return;
    }
    setSaving(true);
    for (const reading of scannedReadings) {
      await supabase.from("vitals").insert({
        user_id: user.id,
        member_id: selectedMember,
        type: reading.type,
        value: reading.value,
        value2: reading.value2 ?? null,
        unit: VITAL_CONFIGS[reading.type]?.unit ?? reading.unit,
        logged_at: new Date().toISOString(),
        notes: reading.notes ?? scannedSource ?? null,
      });
    }
    setSaving(false);
    setShowScanReview(false);
    setScannedReadings([]);
    fetchData();
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.member_id || !form.value) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("vitals").insert({
      user_id: user.id,
      member_id: form.member_id,
      type: form.type,
      value: parseFloat(form.value),
      value2: form.value2 ? parseFloat(form.value2) : null,
      unit: VITAL_CONFIGS[form.type]?.unit ?? "",
      logged_at: new Date(form.logged_at).toISOString(),
      notes: form.notes || null,
    });
    setSaving(false);
    setShowModal(false);
    setForm(emptyForm);
    fetchData();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await supabase.from("vitals").delete().eq("id", id);
    setDeleting(null);
    fetchData();
  }

  const memberVitals = vitals.filter((v) =>
    selectedMember ? v.member_id === selectedMember : true,
  );

  const chartData = memberVitals
    .filter((v) => v.type === activeChart)
    .slice(0, 30)
    .reverse()
    .map((v) => ({
      date: new Date(v.logged_at).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      value: Number(v.value),
      value2: v.value2 ? Number(v.value2) : undefined,
    }));

  const latestByType = Object.keys(VITAL_CONFIGS).reduce(
    (acc, type) => {
      const latest = memberVitals.filter((v) => v.type === type);
      acc[type] = latest;
      return acc;
    },
    {} as Record<string, Vital[]>,
  );

  const alerts = Object.entries(latestByType).filter(
    ([type, v]) =>
      v.length > 0 &&
      getStatus(type, Number(v[0].value), v[0].value2) !== "normal",
  );

  const activeCfg = VITAL_CONFIGS[activeChart];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vitals</h1>
          <p className="page-subtitle">
            Track health metrics and spot trends early
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={vitalsFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanVitals}
          />
          <button
            onClick={() => vitalsFileRef.current?.click()}
            disabled={scanningVitals}
            className="btn-secondary flex items-center gap-2"
          >
            {scanningVitals ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {scanningVitals ? "Scanning..." : "Scan Report"}
          </button>
          <button
            onClick={() => {
              setShowScanReview(false);
              setForm(emptyForm);
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Log reading
          </button>
        </div>
      </div>

      {/* Member selector */}
      {members.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(m.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                selectedMember === m.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-white text-muted-foreground hover:border-primary/50"
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {m.name[0]}
              </div>
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map(([type, vList]) => {
            const status = getStatus(
              type,
              Number(vList[0].value),
              vList[0].value2,
            );
            const cfg = VITAL_CONFIGS[type];
            return (
              <div
                key={type}
                className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${
                  status === "critical"
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <AlertCircle
                  className={`w-5 h-5 shrink-0 ${status === "critical" ? "text-red-500" : "text-amber-500"}`}
                />
                <p
                  className={`text-sm ${status === "critical" ? "text-red-800" : "text-amber-800"}`}
                >
                  <strong>{cfg.label}</strong> reading of{" "}
                  <strong>{formatValue(vList[0])}</strong> is outside the normal
                  range.{" "}
                  {status === "critical"
                    ? "Please consult a doctor."
                    : "Monitor closely."}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Vital type cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(VITAL_CONFIGS).map(([type, cfg]) => {
              const typeVitals = latestByType[type];
              const latest = typeVitals?.[0];
              const status = latest
                ? getStatus(type, Number(latest.value), latest.value2)
                : "normal";
              const trend = getTrend(typeVitals ?? []);
              const isActive = activeChart === type;

              return (
                <button
                  key={type}
                  onClick={() => setActiveChart(type)}
                  className={`bg-white rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                    isActive
                      ? "border-primary ring-2 ring-primary/20"
                      : status === "critical"
                        ? "border-red-300"
                        : status === "warning"
                          ? "border-amber-300"
                          : "border-border"
                  }`}
                >
                  <div className="text-xl mb-2" style={{ fontSize: "20px" }}>
                    {cfg.icon}
                  </div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {cfg.label}
                  </div>
                  {latest ? (
                    <>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: cfg.color }}
                      >
                        {formatValue(latest)}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {trend === "up" && (
                          <TrendingUp className="w-3 h-3 text-muted-foreground" />
                        )}
                        {trend === "down" && (
                          <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        )}
                        {trend === "stable" && (
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {typeVitals.length} readings
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <span style={{ fontSize: "16px" }}>{activeCfg.icon}</span>
                    {activeCfg.label} trend
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeCfg.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {chartData.length} readings
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#888" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                    formatter={(val: number) => [
                      `${val} ${activeCfg.unit}`,
                      activeCfg.label,
                    ]}
                  />
                  {activeCfg.normalMin > 0 && (
                    <ReferenceLine
                      y={activeCfg.normalMin}
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  )}
                  {activeCfg.normalMax < 999 && (
                    <ReferenceLine
                      y={activeCfg.normalMax}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={activeCfg.color}
                    strokeWidth={2}
                    dot={{ fill: activeCfg.color, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  {activeChart === "blood_pressure" && (
                    <Line
                      type="monotone"
                      dataKey="value2"
                      stroke="#378ADD"
                      strokeWidth={2}
                      dot={{ fill: "#378ADD", r: 3 }}
                      strokeDasharray="5 5"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-6 h-0.5 bg-emerald-500"
                    style={{ borderTop: "1px dashed #10b981" }}
                  ></span>
                  Min normal
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-6 h-0.5 bg-red-400"
                    style={{ borderTop: "1px dashed #ef4444" }}
                  ></span>
                  Max normal
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border p-10 text-center">
              <div className="text-3xl mb-3" style={{ fontSize: "32px" }}>
                {activeCfg.icon}
              </div>
              <h3 className="font-semibold mb-1">
                No {activeCfg.label} readings yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeCfg.description}
              </p>
              <button
                onClick={() => {
                  setForm({ ...emptyForm, type: activeChart });
                  setShowModal(true);
                }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Log first reading
              </button>
            </div>
          )}

          {/* Recent readings table */}
          {memberVitals.length > 0 && (
            <div className="bg-white rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-sm">Recent readings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                        Type
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Reading
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Date & time
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                        Notes
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberVitals.slice(0, 20).map((v) => {
                      const cfg = VITAL_CONFIGS[v.type];
                      const status = getStatus(
                        v.type,
                        Number(v.value),
                        v.value2,
                      );
                      return (
                        <tr
                          key={v.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: "14px" }}>
                                {cfg?.icon ?? "📊"}
                              </span>
                              <span className="text-sm font-medium">
                                {cfg?.label ?? v.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-sm font-semibold"
                              style={{ color: cfg?.color }}
                            >
                              {formatValue(v)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {status === "normal" && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                              </span>
                            )}
                            {status === "warning" && (
                              <span className="flex items-center gap-1 text-xs text-amber-600">
                                <AlertCircle className="w-3.5 h-3.5" /> Watch
                              </span>
                            )}
                            {status === "critical" && (
                              <span className="flex items-center gap-1 text-xs text-red-600">
                                <AlertCircle className="w-3.5 h-3.5" /> Alert
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(v.logged_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {v.notes ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDelete(v.id)}
                              disabled={deleting === v.id}
                              className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-auto"
                            >
                              {deleting === v.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">Log vital reading</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Family member *
                </label>
                <select
                  value={form.member_id}
                  onChange={(e) =>
                    setForm({ ...form, member_id: e.target.value })
                  }
                  required
                  className="input-field"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Vital type *
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                      value: "",
                      value2: "",
                    })
                  }
                  className="input-field"
                >
                  {Object.entries(VITAL_CONFIGS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {VITAL_CONFIGS[form.type]?.description}
                </p>
              </div>
              <div
                className={`grid gap-3 ${VITAL_CONFIGS[form.type]?.placeholder2 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    {form.type === "blood_pressure" ? "Systolic" : "Value"} *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.value}
                    onChange={(e) =>
                      setForm({ ...form, value: e.target.value })
                    }
                    placeholder={VITAL_CONFIGS[form.type]?.placeholder}
                    required
                    className="input-field"
                  />
                </div>
                {VITAL_CONFIGS[form.type]?.placeholder2 && (
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Diastolic *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.value2}
                      onChange={(e) =>
                        setForm({ ...form, value2: e.target.value })
                      }
                      placeholder={VITAL_CONFIGS[form.type]?.placeholder2}
                      required
                      className="input-field"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Date & time
                </label>
                <input
                  type="datetime-local"
                  value={form.logged_at}
                  onChange={(e) =>
                    setForm({ ...form, logged_at: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Notes
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. After exercise, fasting"
                  className="input-field"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.member_id}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan review modal */}
      {showScanReview && scannedReadings.length > 0 && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="font-semibold">Scanned vitals</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {scannedReadings.length} reading
                  {scannedReadings.length > 1 ? "s" : ""} found
                  {scannedSource ? ` · ${scannedSource}` : ""}
                </p>
              </div>
              <button
                onClick={() => setShowScanReview(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-800">
                  Vitals scanned successfully — review before saving
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Save for family member *
                </label>
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {scannedReadings.map((reading, i) => {
                  const cfg = VITAL_CONFIGS[reading.type];
                  return (
                    <div
                      key={i}
                      className="bg-muted/30 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cfg?.icon ?? "📊"}</span>
                        <div>
                          <div className="text-sm font-semibold">
                            {cfg?.label ?? reading.type}
                          </div>
                          {reading.notes && (
                            <div className="text-xs text-muted-foreground">
                              {reading.notes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="text-sm font-bold"
                          style={{ color: cfg?.color }}
                        >
                          {reading.type === "blood_pressure" && reading.value2
                            ? `${reading.value}/${reading.value2}`
                            : reading.value}{" "}
                          {cfg?.unit ?? reading.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowScanReview(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScannedVitals}
                  disabled={saving || !selectedMember}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save {scannedReadings.length} reading
                  {scannedReadings.length > 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
