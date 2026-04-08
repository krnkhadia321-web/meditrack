'use client'

import { useState } from 'react'
import { Brain, Send, Loader2, Sparkles, ChevronRight, Shield, TrendingDown, Building2, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react'

type AdvisorResult = {
  text: string
  procedureData: Record<string, string> | null
}

const SUGGESTED_SCENARIOS = [
  {
    icon: '🔬',
    title: 'MRI Scan',
    query: 'My doctor recommended an MRI scan. Apollo Hospital quoted ₹8,000. Should I go ahead?',
    tag: 'Diagnostics',
  },
  {
    icon: '🦷',
    title: 'Root Canal',
    query: 'I need a root canal treatment. The dentist quoted ₹12,000. Is this fair? Any cheaper options?',
    tag: 'Dental',
  },
  {
    icon: '👁️',
    title: 'LASIK Surgery',
    query: 'Considering LASIK eye surgery quoted at ₹45,000 per eye. Should I do it? Is this covered by insurance?',
    tag: 'Surgery',
  },
  {
    icon: '🩸',
    title: 'Full Body Checkup',
    query: 'A corporate hospital is offering a full body health checkup for ₹3,500. Worth it or overpriced?',
    tag: 'Preventive',
  },
  {
    icon: '🏥',
    title: 'Knee Replacement',
    query: 'My father needs knee replacement surgery. Fortis quoted ₹3,50,000. Should we go ahead? Any government options?',
    tag: 'Surgery',
  },
  {
    icon: '💊',
    title: 'Costly Medicine',
    query: 'Doctor prescribed Insulin Glargine at ₹1,800/month. Is this necessary or are there cheaper alternatives?',
    tag: 'Medicines',
  },
]

function RecommendationCard({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim())

  // Try to detect key sections in the AI response
  const isYes = text.toLowerCase().includes('yes') || text.toLowerCase().includes('go ahead') || text.toLowerCase().includes('recommend')
  const isNo = text.toLowerCase().includes('wait') || text.toLowerCase().includes('avoid') || text.toLowerCase().includes('overpriced')
  const isCaution = !isYes && !isNo

  const headerColor = isNo
    ? 'bg-red-50 border-red-200'
    : isCaution
    ? 'bg-amber-50 border-amber-200'
    : 'bg-emerald-50 border-emerald-200'

  const headerIcon = isNo
    ? <AlertCircle className="w-5 h-5 text-red-500" />
    : isCaution
    ? <AlertCircle className="w-5 h-5 text-amber-500" />
    : <CheckCircle2 className="w-5 h-5 text-emerald-600" />

  const headerText = isNo ? 'Consider Alternatives First' : isCaution ? 'Proceed with Caution' : 'Good to Proceed'
  const headerTextColor = isNo ? 'text-red-700' : isCaution ? 'text-amber-700' : 'text-emerald-700'

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div className={`rounded-2xl border p-4 flex items-center gap-3 ${headerColor}`}>
        {headerIcon}
        <span className={`font-semibold text-sm ${headerTextColor}`}>{headerText}</span>
      </div>

      {/* Full response */}
      <div className="bg-white rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">AI Recommendation</span>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => {
            // Detect numbered points
            const isNumbered = /^\d+\./.test(line.trim())
            const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-')
            const isHeading = line.trim().endsWith(':') && line.trim().length < 40

            if (isHeading) {
              return (
                <p key={i} className="text-sm font-semibold text-foreground mt-3 mb-1">
                  {line}
                </p>
              )
            }
            if (isNumbered || isBullet) {
              return (
                <div key={i} className="flex gap-2 text-sm text-foreground leading-relaxed">
                  <span className="shrink-0 text-primary font-medium mt-0.5">
                    {isNumbered ? line.match(/^\d+\./)?.[0] : '•'}
                  </span>
                  <span>{line.replace(/^\d+\./, '').replace(/^[•\-]\s*/, '').trim()}</span>
                </div>
              )
            }
            return (
              <p key={i} className="text-sm text-foreground leading-relaxed">
                {line}
              </p>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function AdvisorPage() {
  const [query, setQuery] = useState('')
const [city, setCity] = useState('')
const [cityInput, setCityInput] = useState('')
const [loading, setLoading] = useState(false)
const [result, setResult] = useState<AdvisorResult | null>(null)
const [error, setError] = useState('')
const [needsCity, setNeedsCity] = useState(false)

  async function handleQuery(text?: string) {
  const q = text ?? query.trim()
  if (!q || loading) return

  setLoading(true)
  setResult(null)
  setError('')
  setNeedsCity(false)
  if (!text) setQuery('')

  try {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, city: city || undefined }),
    })
    const data = await res.json()
    if (data.error === 'CITY_REQUIRED') {
      setNeedsCity(true)
      setLoading(false)
      return
    }
    if (data.error) throw new Error(data.error)
    setResult(data)
  } catch {
    setError('Failed to get recommendation. Please try again.')
  } finally {
    setLoading(false)
  }
}

function handleCitySubmit() {
  if (!cityInput.trim()) return
  setCity(cityInput.trim())
  setNeedsCity(false)
}

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuery()
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Should I?
          </h1>
          <p className="page-subtitle">
            Get a personalised recommendation before spending on any medical procedure
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">Uses your insurance + budget data</span>
        </div>
      </div>

      {/* How it works — only show before first query */}
      {!result && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: <IndianRupee className="w-5 h-5 text-blue-600" />,
              bg: 'bg-blue-50',
              title: 'Live price comparison',
              desc: 'Searches real hospital prices in your city right now',
            },
            {
              icon: <Shield className="w-5 h-5 text-emerald-600" />,
              bg: 'bg-emerald-50',
              title: 'Insurance check',
              desc: 'Checks your active policies and coverage limits',
            },
            {
              icon: <Building2 className="w-5 h-5 text-purple-600" />,
              bg: 'bg-purple-50',
              title: 'Government options',
              desc: 'Finds PMJAY, CGHS, and govt hospital alternatives',
            },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl border border-border p-5">
              <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center mb-3`}>
                {item.icon}
              </div>
              <div className="font-semibold text-sm mb-1">{item.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input box */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <label className="text-sm font-medium mb-2 block">
          Describe your situation
        </label>
        <div className="flex gap-3 items-end">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "My doctor said I need an MRI. Apollo quoted ₹8,000. Should I go ahead?"'
            rows={2}
            disabled={loading}
            className="input-field flex-1 resize-none"
          />
          <button
            onClick={() => handleQuery()}
            disabled={loading || !query.trim()}
            className="btn-primary h-11 w-11 flex items-center justify-center p-0 shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
  <p className="text-xs text-muted-foreground">
    Include the procedure name, quoted price, and hospital for the best recommendation
  </p>
  {city ? (
    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
      <span className="text-xs text-emerald-700 font-medium">📍 {city}</span>
      <button onClick={() => setCity('')} className="text-emerald-500 hover:text-emerald-700 text-xs ml-1">✕</button>
    </div>
  ) : (
    <button onClick={() => setNeedsCity(true)} className="text-xs text-primary hover:underline">
      + Set your city
    </button>
  )}
</div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-2xl border border-border p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Brain className="w-7 h-7 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1">Analysing your situation...</p>
              <p className="text-xs text-muted-foreground">Checking insurance · Searching live prices · Finding govt options</p>
            </div>
            <div className="flex gap-2">
              {['Checking your insurance', 'Searching live prices', 'Finding cheaper options'].map((step, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-3 py-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* City required prompt */}
{needsCity && !loading && (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
    <div className="flex items-center gap-2 mb-3">
      <AlertCircle className="w-5 h-5 text-amber-600" />
      <span className="font-semibold text-sm text-amber-800">Your city is needed for local recommendations</span>
    </div>
    <p className="text-xs text-amber-700 mb-4">
      MediTrack needs your city to find hospitals and diagnostic centres near you.
    </p>
    <div className="flex gap-3">
      <input
        value={cityInput}
        onChange={e => setCityInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleCitySubmit()}
        placeholder="e.g. Gurugram, Mumbai, Bangalore"
        className="input-field flex-1"
      />
      <button
        onClick={handleCitySubmit}
        className="btn-primary px-5"
      >
        Set city & search
      </button>
    </div>
  </div>
)}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4 mb-8">
          <RecommendationCard text={result.text} />

          {/* Data sources used */}
          {result.procedureData && Object.keys(result.procedureData).length > 0 && (
            <div className="bg-muted/30 rounded-2xl border border-border p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Data sources used in this analysis
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(result.procedureData)
                  .filter(([k]) => !k.includes('Use all') && !k.includes('DECISION'))
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <div key={key} className="bg-white rounded-xl p-3 border border-border">
                      <div className="text-xs font-medium text-muted-foreground mb-1">{key}</div>
                      <div className="text-xs text-foreground leading-relaxed line-clamp-3">
                        {value}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Ask another */}
          <button
            onClick={() => { setResult(null); setQuery('') }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Brain className="w-4 h-4" /> Ask another question
          </button>
        </div>
      )}

      {/* Suggested scenarios — show when no result */}
      {!result && !loading && (
        <div>
          <p className="text-sm font-semibold mb-4">Common scenarios to try</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SUGGESTED_SCENARIOS.map((s) => (
              <button
                key={s.title}
                onClick={() => handleQuery(s.query)}
                className="bg-white rounded-2xl border border-border p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{s.icon}</span>
                    <span className="font-semibold text-sm">{s.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.query}</p>
                <span className="inline-block mt-2 text-[10px] font-medium bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5">
                  {s.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}