'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Download, Shield, Info, Loader2, CheckCircle2, Heart, Calculator } from 'lucide-react'
import TaxCalculator from '@/components/dashboard/TaxCalculator'

type Profile = {
  full_name: string
  city: string | null
  phone: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ full_name: '', city: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [userEmail, setUserEmail] = useState('')
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

    // Build CSV
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
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your account and preferences</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Section 80D Calculator */}
<div className="bg-white rounded-2xl border border-border p-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
      <Calculator className="w-4 h-4 text-amber-600" />
    </div>
    <div>
      <h2 className="font-semibold text-sm">Section 80D Tax Deduction</h2>
      <p className="text-xs text-muted-foreground">Auto-computed from your MediTrack data</p>
    </div>
  </div>

  <TaxCalculator userId={userEmail} />
</div>

        {/* Profile */}
        
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Profile</h2>
              <p className="text-xs text-muted-foreground">Update your personal information</p>
            </div>
          </div>

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

        {/* Export data */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <Download className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Export Data</h2>
              <p className="text-xs text-muted-foreground">Download all your health and expense data</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Export all your expenses, family members, and insurance policies as a CSV file. You can open it in Excel or Google Sheets.
          </p>
          <button onClick={handleExport} disabled={exporting}
            className="btn-secondary flex items-center gap-2">
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing export...</>
              : <><Download className="w-4 h-4" /> Export as CSV</>}
          </button>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Privacy & Security</h2>
              <p className="text-xs text-muted-foreground">How your data is protected</p>
            </div>
          </div>
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

        {/* About */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center">
              <Info className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">About MediTrack</h2>
              <p className="text-xs text-muted-foreground">Version and app information</p>
            </div>
          </div>
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

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="font-semibold text-sm mb-1">Sign out</h2>
          <p className="text-xs text-muted-foreground mb-4">You'll need to sign in again to access your data</p>
          <button onClick={handleSignOut}
            className="btn-secondary text-destructive hover:bg-destructive/10 hover:border-destructive/30 flex items-center gap-2">
            Sign out of MediTrack
          </button>
        </div>

      </div>
    </div>
  )
}