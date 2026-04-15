'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  User, Download, Shield, Info, Loader2, CheckCircle2,
  Heart, Calculator, LogOut,
} from 'lucide-react'
import TaxCalculator from '@/components/dashboard/TaxCalculator'

type Profile = {
  full_name: string
  city: string | null
  phone: string | null
}

type TabKey = 'tax' | 'profile' | 'privacy' | 'about' | 'signout'

const TABS: { key: TabKey; label: string; sub: string; icon: any; accent: string }[] = [
  { key: 'tax',     label: 'Section 80D',       sub: 'Tax deduction calculator',    icon: Calculator, accent: 'amber' },
  { key: 'profile', label: 'Profile',           sub: 'Update personal information', icon: User,       accent: 'primary' },
  { key: 'privacy', label: 'Privacy & Security', sub: 'Data protection & export',   icon: Shield,     accent: 'emerald' },
  { key: 'about',   label: 'About MediTrack',   sub: 'Version and app info',        icon: Info,       accent: 'purple' },
  { key: 'signout', label: 'Sign out',          sub: 'End this session',            icon: LogOut,     accent: 'red' },
]

const ACCENT_CLASSES: Record<string, { bg: string; text: string; ring: string }> = {
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   ring: 'ring-amber-200' },
  primary: { bg: 'bg-primary/10', text: 'text-primary',     ring: 'ring-primary/30' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  ring: 'ring-purple-200' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     ring: 'ring-red-200' },
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ full_name: '', city: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('tax')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name ?? '', city: data.city ?? '', phone: data.phone ?? '' })
      setLoading(false)
    }
    fetchProfile()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      full_name: profile.full_name,
      city: profile.city || null,
      phone: profile.phone || null,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleExport() {
    setExporting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: expenses }, { data: members }, { data: policies }] = await Promise.all([
      supabase.from('expenses')
        .select('*, expense_categories(name), family_members(name)')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false }),
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('insurance_policies').select('*').eq('user_id', user.id),
    ])

    const lines: string[] = []
    lines.push('=== MEDITRACK DATA EXPORT ===')
    lines.push(`Exported on: ${new Date().toLocaleDateString('en-IN')}`)
    lines.push('')
    lines.push('--- FAMILY MEMBERS ---')
    lines.push('Name,Relation,Date of Birth,Blood Group,Allergies,Chronic Conditions')
    members?.forEach(m => {
      lines.push(`"${m.name}","${m.relation}","${m.date_of_birth ?? ''}","${m.blood_group ?? ''}","${m.allergies ?? ''}","${m.chronic_conditions ?? ''}"`)
    })
    lines.push('')
    lines.push('--- EXPENSES ---')
    lines.push('Date,Description,Member,Category,Amount (₹),Covered (₹),Out of Pocket (₹),Hospital,Doctor')
    expenses?.forEach(e => {
      const oop = Number(e.amount) - Number(e.covered_amount)
      lines.push(`"${e.expense_date}","${e.description}","${(e.family_members as any)?.name ?? ''}","${(e.expense_categories as any)?.name ?? ''}","${e.amount}","${e.covered_amount}","${oop}","${e.hospital_name ?? ''}","${e.doctor_name ?? ''}"`)
    })
    lines.push('')
    lines.push('--- INSURANCE POLICIES ---')
    lines.push('Provider,Plan,Policy Number,Sum Insured (₹),Annual Premium (₹),Renewal Date,Status')
    policies?.forEach(p => {
      lines.push(`"${p.provider_name}","${p.plan_name ?? ''}","${p.policy_number ?? ''}","${p.sum_insured}","${p.premium_annual ?? ''}","${p.renewal_date ?? ''}","${p.is_active ? 'Active' : 'Inactive'}"`)
    })

    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meditrack-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  const active = TABS.find(t => t.key === activeTab)!
  const activeAccent = ACCENT_CLASSES[active.accent]

  return (
    <div className="max-w-5xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account, data and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

        {/* Sidebar tabs */}
        <aside className="space-y-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const accent = ACCENT_CLASSES[tab.accent]
            const isActive = activeTab === tab.key
            const isSignOut = tab.key === 'signout'
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? isSignOut
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-white border border-border shadow-sm'
                    : 'border border-transparent hover:bg-muted/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent.bg}`}>
                  <Icon className={`w-4 h-4 ${accent.text}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${isSignOut ? 'text-red-700' : ''}`}>
                    {tab.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{tab.sub}</div>
                </div>
              </button>
            )
          })}
        </aside>

        {/* Tab content */}
        <div>
          {/* Tab header */}
          <div className="flex items-center gap-3 mb-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeAccent.bg}`}>
              <active.icon className={`w-5 h-5 ${activeAccent.text}`} />
            </div>
            <div>
              <h2 className="font-semibold">{active.label}</h2>
              <p className="text-xs text-muted-foreground">{active.sub}</p>
            </div>
          </div>

          {/* Section 80D */}
          {activeTab === 'tax' && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <TaxCalculator userId={userEmail} />
            </div>
          )}

          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full name</label>
                  <input value={profile.full_name}
                    onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Your full name" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <input value={userEmail} disabled
                    className="input-field opacity-60 cursor-not-allowed bg-muted/40" />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">City</label>
                    <input value={profile.city ?? ''}
                      onChange={e => setProfile({ ...profile, city: e.target.value })}
                      placeholder="e.g. Delhi" className="input-field" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <input value={profile.phone ?? ''}
                      onChange={e => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="e.g. 9876543210" className="input-field" />
                  </div>
                </div>
                <button type="submit" disabled={saving}
                  className="btn-primary flex items-center gap-2">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    : saved
                    ? <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                    : 'Save changes'}
                </button>
              </form>
            </div>
          )}

          {/* Privacy & Security */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-sm mb-4">How your data is protected</h3>
                <div className="space-y-3">
                  {[
                    { title: 'Row-level security', desc: 'Your data is protected by Supabase RLS — only you can access your records' },
                    { title: 'No data selling', desc: 'MediTrack never sells or shares your health data with third parties' },
                    { title: 'Encrypted in transit', desc: 'All data is encrypted using HTTPS/TLS' },
                    { title: 'AI privacy', desc: 'Queries to the AI assistant are not stored or used for training' },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Download className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Export your data</h3>
                    <p className="text-xs text-muted-foreground">Download expenses, family, and policies as CSV</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Open the file in Excel or Google Sheets. Your data stays with you.
                </p>
                <button onClick={handleExport} disabled={exporting}
                  className="btn-secondary flex items-center gap-2">
                  {exporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing export...</>
                    : <><Download className="w-4 h-4" /> Export as CSV</>}
                </button>
              </div>
            </div>
          )}

          {/* About */}
          {activeTab === 'about' && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Version', value: '1.0.0' },
                  { label: 'Built with', value: 'Next.js 14 + Supabase + Groq' },
                  { label: 'AI Model', value: 'Llama 4 Scout (via Groq)' },
                  { label: 'Live search', value: 'Tavily API' },
                  { label: 'Made for', value: '🇮🇳 Indian families' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                <Heart className="w-3 h-3 text-red-400" fill="currentColor" />
                Built to help Indian families save on healthcare costs
              </div>
            </div>
          )}

          {/* Sign out */}
          {activeTab === 'signout' && (
            <div className="bg-white rounded-2xl border border-red-200 p-6">
              <h3 className="font-semibold text-sm mb-1">Ready to sign out?</h3>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                You'll need to sign in again to access your data. Any unsaved changes in open forms will be lost.
              </p>
              <div className="flex items-center gap-3">
                <button onClick={handleSignOut} disabled={signingOut}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                  {signingOut
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing out...</>
                    : <><LogOut className="w-4 h-4" /> Sign out of MediTrack</>}
                </button>
                <button onClick={() => setActiveTab('profile')}
                  className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
