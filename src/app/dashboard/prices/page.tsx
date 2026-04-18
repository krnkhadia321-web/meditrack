'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, Search, Loader2, Shield, MapPin, Users, TrendingDown, Calendar } from 'lucide-react'

const CATEGORIES = [
  'All',
  'Consultation',
  'Medicines',
  'Diagnostics',
  'Surgery',
  'Physiotherapy',
  'Dental',
  'Vision',
  'Mental Health',
  'Vaccination',
]

type PriceResult = {
  hospital: string
  category: string
  category_icon: string
  sample_count: number
  min_price: number
  max_price: number
  median_price: number
  avg_price: number
  last_reported: string
}

export default function PricesPage() {
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [results, setResults] = useState<PriceResult[]>([])
  const [totalDataPoints, setTotalDataPoints] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase = createClient()

  // Auto-populate city from profile
  useEffect(() => {
    async function loadCity() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('city').eq('id', user.id).single()
      if (data?.city) setCity(data.city)
    }
    loadCity()
  }, [])

  async function handleSearch() {
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch('/api/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search: search.trim() || null,
          city: city.trim() || null,
          category: selectedCategory === 'All' ? null : selectedCategory,
        }),
      })
      const data = await res.json()
      setResults(data.results ?? [])
      setTotalDataPoints(data.totalDataPoints ?? 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Search on enter
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  // Auto-search on category change
  useEffect(() => {
    if (searched) handleSearch()
  }, [selectedCategory])

  function priceBarWidth(price: number, min: number, max: number) {
    if (max === min) return 50
    return Math.max(5, Math.min(95, ((price - min) / (max - min)) * 100))
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Price Intelligence
          </h1>
          <p className="page-subtitle">Real prices reported by MediTrack users — anonymised and aggregated</p>
        </div>
      </div>

      {/* Privacy banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3 mb-6">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800">
          All data is anonymised. Only aggregated data from 3+ users is shown. No individual records are ever shared.
        </p>
      </div>

      {/* Search area */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search hospital or procedure... (e.g. Apollo, MRI, blood test)"
              className="input-field pl-10"
            />
          </div>
          <div className="relative w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City"
              className="input-field pl-10"
            />
          </div>
          <button onClick={handleSearch} disabled={loading} className="btn-primary flex items-center gap-2 shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Not enough data yet</h3>
          <p className="text-muted-foreground text-sm mb-2 max-w-md mx-auto leading-relaxed">
            We need at least 3 expense reports for the same hospital and category before we can show price ranges.
            As more users log expenses, price intelligence will grow.
          </p>
          <p className="text-xs text-muted-foreground">
            Try broadening your search — remove the city filter or search for a common category like "Diagnostics".
          </p>
        </div>
      )}

      {!loading && !searched && (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Search to see real prices</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Search for a hospital, procedure, or category to see what MediTrack users actually paid.
            Prices are aggregated and anonymised from real expense records.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{results.length}</strong> hospitals found
              {city && <> in <strong className="text-foreground">{city}</strong></>}
              {selectedCategory !== 'All' && <> for <strong className="text-foreground">{selectedCategory}</strong></>}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
              <Users className="w-3 h-3" />
              Based on {totalDataPoints} anonymous reports
            </div>
          </div>

          {/* Result cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r, i) => {
              const range = r.max_price - r.min_price
              const medianPct = range > 0 ? ((r.median_price - r.min_price) / range) * 100 : 50
              return (
                <div key={i} className="bg-white rounded-2xl border border-border p-5 hover:shadow-sm transition-shadow">
                  {/* Hospital + category */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-sm">{r.hospital}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-sm">{r.category_icon}</span>
                        <span className="text-xs text-muted-foreground">{r.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                      <Users className="w-3 h-3" />
                      {r.sample_count} reports
                    </div>
                  </div>

                  {/* Price range visualization */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{formatCurrency(r.min_price)}</span>
                      <span>{formatCurrency(r.max_price)}</span>
                    </div>
                    <div className="h-3 bg-gradient-to-r from-emerald-100 via-amber-100 to-red-100 rounded-full relative">
                      {/* Median marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-white shadow-sm"
                        style={{ left: `${Math.max(5, Math.min(95, medianPct))}%` }}
                        title={`Median: ${formatCurrency(r.median_price)}`}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[10px] text-emerald-600 font-medium">Lowest</span>
                      <span className="text-[10px] text-red-500 font-medium">Highest</span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-emerald-600 font-medium">Median</div>
                      <div className="text-sm font-semibold text-emerald-800">{formatCurrency(r.median_price)}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-blue-600 font-medium">Average</div>
                      <div className="text-sm font-semibold text-blue-800">{formatCurrency(r.avg_price)}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-[10px] text-muted-foreground font-medium">Last reported</div>
                      <div className="text-xs font-medium text-foreground">
                        {new Date(r.last_reported).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
