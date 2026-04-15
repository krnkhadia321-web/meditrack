'use client'

import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { getReportData, currentFYStartYear, type ReportData, type ReportMode } from '@/lib/reports/aggregate'
import { generatePdf } from '@/lib/reports/generatePdf'
import ReportTemplate from './ReportTemplate'
import { FileText, Download, Loader2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function monthOptions(): Array<{ year: number; month: number; label: string }> {
  const now = new Date()
  const out = []
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    })
  }
  return out
}

function fyOptions(): Array<{ fyStartYear: number; label: string }> {
  const current = currentFYStartYear()
  return [0, 1, 2, 3].map(offset => {
    const y = current - offset
    return { fyStartYear: y, label: `FY ${y}–${String(y + 1).slice(2)}` }
  })
}

export default function ReportsPanel() {
  const [mode, setMode] = useState<ReportMode>('monthly')
  const months = useMemo(() => monthOptions(), [])
  const years = useMemo(() => fyOptions(), [])
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0)
  const [selectedFyIdx, setSelectedFyIdx] = useState(0)
  const [hasSenior, setHasSenior] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [lastSuccess, setLastSuccess] = useState('')
  const [renderData, setRenderData] = useState<ReportData | null>(null)
  const hiddenHostRef = useRef<HTMLDivElement | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    setLastSuccess('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      const period = mode === 'monthly'
        ? { year: months[selectedMonthIdx].year, month: months[selectedMonthIdx].month }
        : { year: years[selectedFyIdx].fyStartYear, fyStartYear: years[selectedFyIdx].fyStartYear }

      const data = await getReportData(supabase, user.id, mode, period, hasSenior)

      const empty =
        data.summary.total === 0 &&
        data.insurance.policies.length === 0 &&
        data.health.medicines.length === 0 &&
        data.health.vitals.length === 0
      if (empty) {
        setError(`Nothing to report for ${data.period.label} — no expenses, policies, medicines, or vitals from that period.`)
        setGenerating(false)
        return
      }

      setRenderData(data)

      // Wait two frames so the hidden template is mounted and laid out
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const filename = mode === 'monthly'
        ? `meditrack-monthly-${months[selectedMonthIdx].year}-${String(months[selectedMonthIdx].month + 1).padStart(2, '0')}.pdf`
        : `meditrack-annual-FY${years[selectedFyIdx].fyStartYear}-${String(years[selectedFyIdx].fyStartYear + 1).slice(2)}.pdf`

      await generatePdf('report-root', filename)

      setLastSuccess(`Downloaded ${filename} — covers ${data.period.label} (${data.period.startDate} to ${data.period.endDate}). ${data.summary.expenseCount} expenses, ${data.health.medicines.length} active medicines.`)
      setRenderData(null)
    } catch (err: any) {
      console.error('Report generation failed', err)
      setError(err?.message ?? 'Something went wrong generating the PDF.')
      setRenderData(null)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Report type</div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('monthly')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium border transition-all ${
              mode === 'monthly'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-foreground border-border hover:bg-accent'
            }`}
          >
            📅 Monthly
          </button>
          <button
            onClick={() => setMode('annual')}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium border transition-all ${
              mode === 'annual'
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-foreground border-border hover:bg-accent'
            }`}
          >
            🧾 Annual FY
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {mode === 'monthly'
            ? 'A single-month snapshot of spending, insurance usage, and family health.'
            : 'A full financial-year report including Section 80D tax summary — perfect for filing.'}
        </p>
      </div>

      {/* Period picker */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
          {mode === 'monthly' ? 'Pick a month' : 'Pick a financial year'}
        </label>
        {mode === 'monthly' ? (
          <select
            value={selectedMonthIdx}
            onChange={e => setSelectedMonthIdx(Number(e.target.value))}
            className="input-field"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>{m.label}{i === 0 ? ' (current)' : ''}</option>
            ))}
          </select>
        ) : (
          <>
            <select
              value={selectedFyIdx}
              onChange={e => setSelectedFyIdx(Number(e.target.value))}
              className="input-field mb-3"
            >
              {years.map((y, i) => (
                <option key={i} value={i}>{y.label}{i === 0 ? ' (current)' : ''}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={hasSenior}
                onChange={e => setHasSenior(e.target.checked)}
              />
              <span className="text-muted-foreground">Include senior citizen parents (₹50,000 extra deduction)</span>
            </label>
          </>
        )}
      </div>

      {/* Generate */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm">Generate PDF</div>
            <div className="text-xs text-muted-foreground">
              Will cover: <strong className="text-foreground">
                {mode === 'monthly' ? months[selectedMonthIdx].label : years[selectedFyIdx].label}
              </strong>
            </div>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
            : <><Download className="w-4 h-4" /> Generate &amp; download</>}
        </button>

        {lastSuccess && !generating && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="w-4 h-4" /> {lastSuccess}
          </div>
        )}
        {error && !generating && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* What's included */}
      <div className="bg-muted/30 rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">What's included</div>
        </div>
        <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5 pl-1">
          <li>• Spending summary — total, covered, out-of-pocket with previous-period delta</li>
          <li>• Category breakdown and per-member spending with budget adherence</li>
          <li>• Top 10 expenses table with dates, hospitals and amounts</li>
          <li>• Active insurance policies, total cover and utilisation</li>
          {mode === 'annual' && <li>• Section 80D tax deduction summary with estimated tax saved</li>}
          <li>• Active medicines with refill status and latest vitals with health flags</li>
          <li>• Savings highlights, tips, and a CA-friendly footer</li>
        </ul>
      </div>

      {/* Hidden render host — mounted only during generation */}
      {renderData && typeof document !== 'undefined' && createPortal(
        <div
          ref={hiddenHostRef}
          style={{
            position: 'absolute',
            left: '-10000px',
            top: 0,
            zIndex: -1,
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <ReportTemplate data={renderData} />
        </div>,
        document.body,
      )}
    </div>
  )
}
