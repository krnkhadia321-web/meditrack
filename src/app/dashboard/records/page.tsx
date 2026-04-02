'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { FamilyMember } from '@/types'
import { FileText, Plus, X, Loader2, Trash2, Download } from 'lucide-react'

type HealthRecord = {
  id: string
  member_id: string
  record_type: string
  title: string
  file_url: string | null
  notes: string | null
  record_date: string
  created_at: string
  family_members?: { name: string; relation: string }
}

const RECORD_TYPES = ['prescription', 'report', 'discharge', 'vaccination', 'other']

const TYPE_COLORS: Record<string, string> = {
  prescription: 'bg-blue-100 text-blue-700',
  report: 'bg-purple-100 text-purple-700',
  discharge: 'bg-red-100 text-red-700',
  vaccination: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

const TYPE_ICONS: Record<string, string> = {
  prescription: '💊',
  report: '🔬',
  discharge: '🏥',
  vaccination: '💉',
  other: '📋',
}

export default function RecordsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterMember, setFilterMember] = useState('')
  const [filterType, setFilterType] = useState('')
  const supabase = createClient()

  const emptyForm = {
    member_id: '',
    record_type: 'prescription',
    title: '',
    notes: '',
    record_date: new Date().toISOString().split('T')[0],
  }
  const [form, setForm] = useState(emptyForm)

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: rec }, { data: mem }] = await Promise.all([
      supabase.from('health_records')
        .select('*, family_members(name, relation)')
        .eq('user_id', user.id)
        .order('record_date', { ascending: false }),
      supabase.from('family_members').select('*').eq('user_id', user.id),
    ])
    setRecords(rec ?? [])
    setMembers(mem ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.member_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('health_records').insert({
      user_id: user.id,
      member_id: form.member_id,
      record_type: form.record_type,
      title: form.title,
      notes: form.notes || null,
      record_date: form.record_date,
    })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    fetchData()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('health_records').delete().eq('id', id)
    setDeleting(null)
    fetchData()
  }

  const filtered = records.filter(r => {
    if (filterMember && r.member_id !== filterMember) return false
    if (filterType && r.record_type !== filterType) return false
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Health Records</h1>
          <p className="page-subtitle">Store and manage medical documents for your family</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add record
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6 flex items-center gap-3 flex-wrap">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
          className="input-field w-auto flex-1 min-w-[160px]">
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="input-field w-auto flex-1 min-w-[160px]">
          <option value="">All types</option>
          {RECORD_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        {(filterMember || filterType) && (
          <button onClick={() => { setFilterMember(''); setFilterType('') }}
            className="btn-ghost flex items-center gap-1 text-xs">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No health records yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {records.length === 0
              ? 'Add prescriptions, lab reports, discharge summaries and more.'
              : 'Try clearing your filters.'}
          </p>
          {records.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add first record
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-border p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{TYPE_ICONS[r.record_type] ?? '📋'}</span>
                  <span className={`badge text-xs ${TYPE_COLORS[r.record_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {r.record_type.charAt(0).toUpperCase() + r.record_type.slice(1)}
                  </span>
                </div>
                <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                  className="w-7 h-7 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                  {deleting === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h3 className="font-semibold text-sm mb-1">{r.title}</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {(r.family_members as any)?.name ?? 'Unknown'} · {formatDate(r.record_date)}
              </p>

              {r.notes && (
                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
                  {r.notes}
                </p>
              )}

              {r.file_url && (
                <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                  <Download className="w-3.5 h-3.5" /> View document
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">Add health record</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Family member *</label>
                <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
                  required className="input-field">
                  <option value="">Select member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                {members.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Add a family member first before adding records.</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Record type *</label>
                <select value={form.record_type} onChange={e => setForm({ ...form, record_type: e.target.value })}
                  className="input-field">
                  {RECORD_TYPES.map(t => (
                    <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Blood test report - March 2026" required className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date *</label>
                <input type="date" value={form.record_date}
                  onChange={e => setForm({ ...form, record_date: e.target.value })}
                  required className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Dr. Mehta prescribed, follow up in 2 weeks..."
                  rows={3} className="input-field resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving || !form.member_id}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}