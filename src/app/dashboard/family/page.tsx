'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials, getRelationLabel, getAgeFromDOB } from '@/lib/utils'
import type { FamilyMember } from '@/types'
import { Users, Plus, X, Loader2, Pencil, Trash2, Heart, Salad, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'

const RELATIONS = ['self', 'spouse', 'child', 'parent', 'other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const HEALTH_GOALS = [
  'Weight Loss', 'Weight Gain', 'Muscle Building',
  'Diabetes Management', 'Heart Health', 'General Wellness',
  'Boost Immunity', 'Manage Hypertension',
]

const RELATION_COLORS: Record<string, string> = {
  self: 'bg-primary/10 text-primary',
  spouse: 'bg-pink-100 text-pink-700',
  child: 'bg-blue-100 text-blue-700',
  parent: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}

type DietDay = {
  day: string
  breakfast: string
  midMorning: string
  lunch: string
  eveningSnack: string
  dinner: string
  notes: string
}

type DietChart = {
  id?: string
  goal: string
  memberName: string
  summary: string
  weeklyPlan: DietDay[]
}

export default function FamilyPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [generatingDiet, setGeneratingDiet] = useState(false)
  const [dietChart, setDietChart] = useState<DietChart | null>(null)
  const [loadingChart, setLoadingChart] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>('Monday')
  const [showGoalSelector, setShowGoalSelector] = useState(false)
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

  async function fetchDietChart(memberId: string) {
    setLoadingChart(true)
    const { data } = await supabase
      .from('diet_charts')
      .select('*')
      .eq('member_id', memberId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setDietChart({
        id: data.id,
        goal: data.goal,
        memberName: data.member_id,
        summary: data.summary,
        weeklyPlan: data.weekly_plan,
      })
      setExpandedDay('Monday')
    } else {
      setDietChart(null)
    }
    setLoadingChart(false)
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleSelectMember(m: FamilyMember) {
    setSelectedMember(m)
    setDietChart(null)
    setSelectedGoals([])
    setShowGoalSelector(false)
    await fetchDietChart(m.id)
  }

  function toggleGoal(goal: string) {
    setSelectedGoals(prev =>
      prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]
    )
  }

  function openAdd() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(m: FamilyMember) {
    setEditing(m)
    setForm({ name: m.name, relation: m.relation, date_of_birth: m.date_of_birth ?? '', blood_group: m.blood_group ?? '', allergies: m.allergies ?? '', chronic_conditions: m.chronic_conditions ?? '' })
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { name: form.name, relation: form.relation, date_of_birth: form.date_of_birth || null, blood_group: form.blood_group || null, allergies: form.allergies || null, chronic_conditions: form.chronic_conditions || null }
    if (editing) { await supabase.from('family_members').update(payload).eq('id', editing.id) }
    else { await supabase.from('family_members').insert({ ...payload, user_id: user.id }) }
    setSaving(false); setShowModal(false); fetchMembers()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('family_members').delete().eq('id', id)
    setDeleting(null); fetchMembers()
    if (selectedMember?.id === id) { setSelectedMember(null); setDietChart(null) }
  }

  async function generateDietChart() {
    if (!selectedMember || selectedGoals.length === 0) return
    setGeneratingDiet(true)

    const { data: records } = await supabase
      .from('health_records')
      .select('title, record_type, notes')
      .eq('member_id', selectedMember.id)
      .order('record_date', { ascending: false })
      .limit(5)

    const combinedGoal = selectedGoals.join(' + ')
    const memberContext = `
Name: ${selectedMember.name}
Age: ${selectedMember.date_of_birth ? getAgeFromDOB(selectedMember.date_of_birth) + ' years' : 'Unknown'}
Blood Group: ${selectedMember.blood_group ?? 'Unknown'}
Allergies: ${selectedMember.allergies ?? 'None'}
Chronic Conditions: ${selectedMember.chronic_conditions ?? 'None'}
Health Goals: ${combinedGoal}
Recent Health Records: ${records && records.length > 0 ? records.map(r => `${r.record_type}: ${r.title} — ${r.notes ?? ''}`).join('; ') : 'None'}
`

    try {
      const res = await fetch('/api/diet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberContext, goal: combinedGoal, memberName: selectedMember.name }),
      })
      const data = await res.json()

      // Save to Supabase
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Upsert — update if exists, insert if not
        const existing = await supabase
          .from('diet_charts')
          .select('id')
          .eq('member_id', selectedMember.id)
          .single()

        if (existing.data?.id) {
          await supabase.from('diet_charts').update({
            goal: combinedGoal,
            summary: data.summary,
            weekly_plan: data.weeklyPlan,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.data.id)
        } else {
          await supabase.from('diet_charts').insert({
            user_id: user.id,
            member_id: selectedMember.id,
            goal: combinedGoal,
            summary: data.summary,
            weekly_plan: data.weeklyPlan,
          })
        }
      }

      setDietChart({ ...data, weeklyPlan: data.weeklyPlan })
      setExpandedDay('Monday')
      setShowGoalSelector(false)
      setSelectedGoals([])
    } catch {
      alert('Failed to generate diet chart. Please try again.')
    } finally {
      setGeneratingDiet(false)
    }
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
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Users className="w-8 h-8 text-primary" /></div>
          <h3 className="font-semibold text-lg mb-2">No family members yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Add your family members to start tracking their health expenses.</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add first member</button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Member cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((m) => (
              <div key={m.id}
                onClick={() => handleSelectMember(m)}
                className={`bg-white rounded-2xl border p-6 hover:shadow-sm transition-all cursor-pointer ${selectedMember?.id === m.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-semibold">{getInitials(m.name)}</div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <span className={`badge text-xs mt-0.5 ${RELATION_COLORS[m.relation] ?? 'bg-gray-100 text-gray-600'}`}>{getRelationLabel(m.relation)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); openEdit(m) }} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(m.id) }} disabled={deleting === m.id} className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                      {deleting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  {m.date_of_birth && <div className="flex justify-between"><span className="text-muted-foreground">Age</span><span className="font-medium">{getAgeFromDOB(m.date_of_birth)} years</span></div>}
                  {m.blood_group && <div className="flex justify-between"><span className="text-muted-foreground">Blood group</span><span className="font-medium text-red-600">{m.blood_group}</span></div>}
                  {m.allergies && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Allergies</span><span className="font-medium text-right text-xs">{m.allergies}</span></div>}
                  {m.chronic_conditions && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Conditions</span><span className="font-medium text-right text-xs">{m.chronic_conditions}</span></div>}
                </div>
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <a href={`/dashboard/expenses?member=${m.id}`} onClick={e => e.stopPropagation()} className="text-xs text-primary font-medium hover:underline flex items-center gap-1"><Heart className="w-3 h-3" /> View expenses</a>
                  {selectedMember?.id === m.id && <span className="text-xs text-primary font-medium">Selected ✓</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Diet chart section */}
          {selectedMember && (
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Salad className="w-5 h-5 text-emerald-600" /></div>
                  <div>
                    <h2 className="font-semibold">AI Diet Chart for {selectedMember.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Personalised based on health records, conditions & allergies</p>
                  </div>
                </div>
                {dietChart && !showGoalSelector && (
                  <button onClick={() => setShowGoalSelector(true)}
                    className="btn-secondary flex items-center gap-2 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" /> Generate New Chart
                  </button>
                )}
              </div>

              {loadingChart ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading saved chart...</span>
                </div>
              ) : (
                <>
                  {/* Goal selector — show when no chart OR when regenerating */}
                  {(!dietChart || showGoalSelector) && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Select health goal(s) *
                          <span className="text-xs text-muted-foreground ml-2 font-normal">You can select multiple</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          {HEALTH_GOALS.map(goal => (
                            <button key={goal} onClick={() => toggleGoal(goal)}
                              className={`text-sm rounded-xl px-3 py-2.5 border text-left transition-all ${selectedGoals.includes(goal) ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border hover:border-primary/50 hover:bg-accent'}`}>
                              {selectedGoals.includes(goal) && '✓ '}{goal}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={generateDietChart} disabled={selectedGoals.length === 0 || generatingDiet}
                          className="btn-primary flex items-center gap-2">
                          {generatingDiet
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing & generating...</>
                            : <><Salad className="w-4 h-4" /> Generate {selectedGoals.length > 0 ? `(${selectedGoals.length} goal${selectedGoals.length > 1 ? 's' : ''})` : ''} 7-Day Diet Chart</>}
                        </button>
                        {showGoalSelector && (
                          <button onClick={() => { setShowGoalSelector(false); setSelectedGoals([]) }}
                            className="btn-secondary">Cancel</button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Existing chart display */}
                  {dietChart && !showGoalSelector && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                        <div className="text-sm font-semibold text-emerald-800 mb-1">
                          🎯 Goal: {dietChart.goal}
                        </div>
                        <p className="text-sm text-emerald-700 leading-relaxed">{dietChart.summary}</p>
                      </div>

                      <div className="space-y-2">
                        {dietChart.weeklyPlan.map((day) => (
                          <div key={day.day} className="border border-border rounded-xl overflow-hidden">
                            <button onClick={() => setExpandedDay(expandedDay === day.day ? null : day.day)}
                              className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                              <span className="font-medium text-sm">{day.day}</span>
                              {expandedDay === day.day
                                ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            {expandedDay === day.day && (
                              <div className="p-4 space-y-3">
                                {[
                                  { label: '🌅 Breakfast', value: day.breakfast },
                                  { label: '🍎 Mid Morning', value: day.midMorning },
                                  { label: '🍱 Lunch', value: day.lunch },
                                  { label: '☕ Evening Snack', value: day.eveningSnack },
                                  { label: '🌙 Dinner', value: day.dinner },
                                ].map(({ label, value }) => (
                                  <div key={label} className="flex gap-3">
                                    <span className="text-sm font-medium w-32 shrink-0 text-muted-foreground">{label}</span>
                                    <span className="text-sm">{value}</span>
                                  </div>
                                ))}
                                {day.notes && (
                                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 mt-2">
                                    💡 {day.notes}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-semibold">{editing ? 'Edit member' : 'Add family member'}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Full name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma" required className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Relation *</label>
                <select value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })} className="input-field">
                  {RELATIONS.map(r => <option key={r} value={r}>{getRelationLabel(r)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Date of birth</label>
                  <input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Blood group</label>
                  <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })} className="input-field">
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Allergies</label>
                <input value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} placeholder="e.g. Penicillin, Dust" className="input-field" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Chronic conditions</label>
                <input value={form.chronic_conditions} onChange={e => setForm({ ...form, chronic_conditions: e.target.value })} placeholder="e.g. Diabetes, Hypertension" className="input-field" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
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