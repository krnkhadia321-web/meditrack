'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InsurancePolicy } from '@/types'
import { Shield, Plus, X, Loader2, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const emptyForm = {
    provider_name: '', policy_number: '', plan_name: '',
    sum_insured: '', premium_annual: '', renewal_date: '', is_active: true,
  }
  const [form, setForm] = useState(emptyForm)

  async function fetchPolicies() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('insurance_policies')
      .select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPolicies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPolicies() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('insurance_policies').insert({
      user_id: user.id,
      provider_name: form.provider_name,
      policy_number: form.policy_number || null,
      plan_name: form.plan_name || null,
      sum_insured: parseFloat(form.sum_insured) || 0,
      premium_annual: parseFloat(form.premium_annual) || null,
      renewal_date: form.renewal_date || null,
      is_active: form.is_active,
    })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    fetchPolicies()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('insurance_policies').delete().eq('id', id)
    setDeleting(null)
    fetchPolicies()
  }

  function getDaysToRenewal(date: string) {
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  }

  const totalCover = policies.filter(p => p.is_active).reduce((s, p) => s + Number(p.sum_insured), 0)
  const totalPremium = policies.filter(p => p.is_active && p.premium_annual)
    .reduce((s, p) => s + Number(p.premium_annual), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Insurance</h1>
          <p className="page-subtitle">Track your health insurance policies</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add policy
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-muted-foreground mb-1">Total Coverage</div>
          <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(totalCover)}</div>
          <div className="text-xs text-muted-foreground mt-1">{policies.filter(p => p.is_active).length} active policies</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-muted-foreground mb-1">Annual Premium</div>
          <div className="text-2xl font-semibold">{formatCurrency(totalPremium)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {totalPremium > 0 ? `₹${Math.round(totalPremium / 12).toLocaleString('en-IN')}/month` : 'No premium data'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No policies added yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Add your health insurance policies to track coverage and renewals.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add first policy
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((p) => {
            const daysLeft = p.renewal_date ? getDaysToRenewal(p.renewal_date) : null
            const renewingSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="font-semibold">{p.provider_name}</div>
                      {p.plan_name && <div className="text-xs text-muted-foreground">{p.plan_name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {daysLeft !== null && daysLeft <= 0
  ? <span className="badge bg-red-100 text-red-600 text-xs">Expired</span>
  : p.is_active
  ? <span className="badge bg-emerald-100 text-emerald-700 text-xs">Active</span>
  : <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>}
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                      {deleting === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sum insured</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(Number(p.sum_insured))}</span>
                  </div>
                  {p.premium_annual && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Annual premium</span>
                      <span className="font-medium">{formatCurrency(Number(p.premium_annual))}</span>
                    </div>
                  )}
                  {p.policy_number && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Policy no.</span>
                      <span className="font-mono text-xs font-medium">{p.policy_number}</span>
                    </div>
                  )}
                  {p.renewal_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Renewal</span>
                      <div className="flex items-center gap-1.5">
                        {renewingSoon
                          ? <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        <span className={`text-xs font-medium ${renewingSoon ? 'text-amber-600' : ''}`}>
                          {formatDate(p.renewal_date)}
                          {daysLeft !== null && daysLeft > 0 && ` (${daysLeft}d)`}
                          {daysLeft !== null && daysLeft <= 0 && ' (Expired)'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">Add insurance policy</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Insurance provider *</label>
                <input value={form.provider_name}
                  onChange={e => setForm({ ...form, provider_name: e.target.value })}
                  placeholder="e.g. Star Health, HDFC Ergo" required className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Policy number</label>
                  <input value={form.policy_number}
                    onChange={e => setForm({ ...form, policy_number: e.target.value })}
                    placeholder="e.g. SH123456" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Plan name</label>
                  <input value={form.plan_name}
                    onChange={e => setForm({ ...form, plan_name: e.target.value })}
                    placeholder="e.g. Family Floater" className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Sum insured (₹) *</label>
                  <input type="number" min="0" value={form.sum_insured}
                    onChange={e => setForm({ ...form, sum_insured: e.target.value })}
                    placeholder="500000" required className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Annual premium (₹)</label>
                  <input type="number" min="0" value={form.premium_annual}
                    onChange={e => setForm({ ...form, premium_annual: e.target.value })}
                    placeholder="12000" className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Renewal date</label>
                <input type="date" value={form.renewal_date}
                  onChange={e => setForm({ ...form, renewal_date: e.target.value })}
                  className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}