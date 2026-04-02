'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getRelationLabel, getAgeFromDOB, formatDate } from '@/lib/utils'
import type { FamilyMember } from '@/types'
import { Users, Plus, X, Loader2, Pencil, Trash2, Heart } from 'lucide-react'

const RELATIONS = ['self', 'spouse', 'child', 'parent', 'other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const RELATION_COLORS: Record<string, string> = {
  self: 'bg-primary/10 text-primary',
  spouse: 'bg-pink-100 text-pink-700',
  child: 'bg-blue-100 text-blue-700',
  parent: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  const emptyForm = { name: '', relation: 'self', date_of_birth: '', blood_group: '', allergies: '', chronic_conditions: '' }
  const [form, setForm] = useState(emptyForm)

  async function fetchMembers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('family_members').select('*')
      .eq('user_id', user.id).order('created_at')
    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(m: FamilyMember) {
    setEditing(m)
    setForm({
      name: m.name,
      relation: m.relation,
      date_of_birth: m.date_of_birth ?? '',
      blood_group: m.blood_group ?? '',
      allergies: m.allergies ?? '',
      chronic_conditions: m.chronic_conditions ?? '',
    })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      name: form.name,
      relation: form.relation,
      date_of_birth: form.date_of_birth || null,
      blood_group: form.blood_group || null,
      allergies: form.allergies || null,
      chronic_conditions: form.chronic_conditions || null,
    }

    if (editing) {
      await supabase.from('family_members').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('family_members').insert({ ...payload, user_id: user.id })
    }

    setSaving(false)
    setShowModal(false)
    fetchMembers()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('family_members').delete().eq('id', id)
    setDeleting(null)
    fetchMembers()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Family Members</h1>
          <p className="page-subtitle">Manage health profiles for your family</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add member
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No family members yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Add your family members to start tracking their health expenses.</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add first member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-border p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-semibold">
                    {getInitials(m.name)}
                  </div>
                  <div>
                    <div className="font-semibold">{m.name}</div>
                    <span className={`badge text-xs mt-0.5 ${RELATION_COLORS[m.relation] ?? 'bg-gray-100 text-gray-600'}`}>
                      {getRelationLabel(m.relation)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(m)}
                    className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                    {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {m.date_of_birth && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Age</span>
                    <span className="font-medium">{getAgeFromDOB(m.date_of_birth)} years</span>
                  </div>
                )}
                {m.blood_group && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blood group</span>
                    <span className="font-medium text-red-600">{m.blood_group}</span>
                  </div>
                )}
                {m.allergies && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Allergies</span>
                    <span className="font-medium text-right text-xs">{m.allergies}</span>
                  </div>
                )}
                {m.chronic_conditions && (
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Conditions</span>
                    <span className="font-medium text-right text-xs">{m.chronic_conditions}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <a href={`/dashboard/expenses?member=${m.id}`}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                  <Heart className="w-3 h-3" /> View expenses
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit member' : 'Add family member'}</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Sharma" required className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Relation *</label>
                <select value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })}
                  className="input-field">
                  {RELATIONS.map(r => <option key={r} value={r}>{getRelationLabel(r)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Date of birth</label>
                  <input type="date" value={form.date_of_birth}
                    onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Blood group</label>
                  <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })}
                    className="input-field">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Allergies</label>
                <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Dust" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Chronic conditions</label>
                <input value={form.chronic_conditions}
                  onChange={e => setForm({ ...form, chronic_conditions: e.target.value })}
                  placeholder="e.g. Diabetes, Hypertension" className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? 'Save changes' : 'Add member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}