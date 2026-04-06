'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import type { FamilyMember } from '@/types'
import {
  Pill, Plus, X, Loader2, Trash2, Bell, BellOff,
  AlertCircle, CheckCircle2, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react'

type Medicine = {
  id: string
  member_id: string
  name: string
  generic_name: string | null
  dosage: string
  frequency: string
  times_per_day: number
  reminder_times: string[]
  total_quantity: number | null
  remaining_quantity: number | null
  refill_alert_at: number
  prescribed_by: string | null
  start_date: string
  end_date: string | null
  is_active: boolean
  notes: string | null
  family_members?: { name: string; relation: string }
}

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Three times daily',
  'Every 8 hours', 'Every 6 hours', 'Weekly', 'As needed'
]

const DEFAULT_TIMES: Record<string, string[]> = {
  'Once daily': ['08:00'],
  'Twice daily': ['08:00', '20:00'],
  'Three times daily': ['08:00', '14:00', '20:00'],
  'Every 8 hours': ['08:00', '16:00', '00:00'],
  'Every 6 hours': ['06:00', '12:00', '18:00', '00:00'],
  'Weekly': ['08:00'],
  'As needed': [],
}

function getDaysRemaining(remaining: number, timesPerDay: number): number {
  if (timesPerDay === 0) return 0
  return Math.floor(remaining / timesPerDay)
}

function getRefillStatus(med: Medicine): 'ok' | 'warning' | 'critical' {
  if (!med.remaining_quantity) return 'ok'
  const days = getDaysRemaining(med.remaining_quantity, med.times_per_day)
  if (days <= med.refill_alert_at) return days <= 2 ? 'critical' : 'warning'
  return 'ok'
}

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default')
  const [expandedMed, setExpandedMed] = useState<string | null>(null)
  const [filterMember, setFilterMember] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const supabase = createClient()

  const emptyForm = {
    name: '', generic_name: '', dosage: '', frequency: 'Once daily',
    reminder_times: ['08:00'], total_quantity: '', remaining_quantity: '',
    refill_alert_at: '5', prescribed_by: '', start_date: new Date().toISOString().split('T')[0],
    end_date: '', notes: '', member_id: '', is_active: true,
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if ('Notification' in window) setNotifPermission(Notification.permission)
    fetchData()
  }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: meds }, { data: mem }] = await Promise.all([
      supabase.from('medicines')
        .select('*, family_members(name, relation)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('family_members').select('*').eq('user_id', user.id),
    ])
    setMedicines(meds ?? [])
    setMembers(mem ?? [])
    setLoading(false)
  }

  async function requestNotifications() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
    if (perm === 'granted') {
      new Notification('MediTrack Reminders enabled', {
        body: 'You will now receive medicine reminders.',
        icon: '/favicon.ico',
      })
    }
  }

  function scheduleReminder(medicine: Medicine) {
    if (notifPermission !== 'granted') return
    if (!medicine.reminder_times?.length) return
    const now = new Date()
    medicine.reminder_times.forEach(time => {
      const [h, m] = time.split(':').map(Number)
      const next = new Date()
      next.setHours(h, m, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      const ms = next.getTime() - now.getTime()
      if (ms < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          new Notification(`Time to take ${medicine.name}`, {
            body: `${medicine.dosage} — ${time}`,
            icon: '/favicon.ico',
          })
        }, ms)
      }
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.member_id) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newMed } = await supabase.from('medicines').insert({
      user_id: user.id,
      member_id: form.member_id,
      name: form.name,
      generic_name: form.generic_name || null,
      dosage: form.dosage,
      frequency: form.frequency,
      times_per_day: form.reminder_times.length || 1,
      reminder_times: form.reminder_times,
      total_quantity: form.total_quantity ? parseInt(form.total_quantity) : null,
      remaining_quantity: form.remaining_quantity ? parseInt(form.remaining_quantity) : null,
      refill_alert_at: parseInt(form.refill_alert_at) || 5,
      prescribed_by: form.prescribed_by || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
      is_active: form.is_active,
    }).select().single()

    if (newMed) scheduleReminder(newMed as Medicine)
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    fetchData()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('medicines').delete().eq('id', id)
    setDeleting(null)
    fetchData()
  }

  async function handleMarkTaken(med: Medicine) {
    if (!med.remaining_quantity) return
    await supabase.from('medicines').update({
      remaining_quantity: Math.max(0, med.remaining_quantity - 1),
      updated_at: new Date().toISOString(),
    }).eq('id', med.id)
    fetchData()
  }

  async function handleToggleActive(med: Medicine) {
    await supabase.from('medicines').update({ is_active: !med.is_active }).eq('id', med.id)
    fetchData()
  }

  function handleFrequencyChange(freq: string) {
    setForm(f => ({ ...f, frequency: freq, reminder_times: DEFAULT_TIMES[freq] ?? ['08:00'] }))
  }

  const filtered = medicines.filter(m => {
    if (!showInactive && !m.is_active) return false
    if (filterMember && m.member_id !== filterMember) return false
    return true
  })

  const activeCount = medicines.filter(m => m.is_active).length
  const warningCount = medicines.filter(m => m.is_active && getRefillStatus(m) !== 'ok').length
  const todayDoses = medicines
    .filter(m => m.is_active && m.frequency !== 'As needed')
    .reduce((s, m) => s + m.times_per_day, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicines</h1>
          <p className="page-subtitle">Track prescriptions, reminders, and refill alerts</p>
        </div>
        <div className="flex items-center gap-3">
          {notifPermission !== 'granted' && (
            <button onClick={requestNotifications}
              className="btn-secondary flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4" /> Enable reminders
            </button>
          )}
          {notifPermission === 'granted' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <Bell className="w-3.5 h-3.5" /> Reminders active
            </div>
          )}
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add medicine
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-muted-foreground mb-1">Active medicines</div>
          <div className="text-2xl font-semibold">{activeCount}</div>
        </div>
        <div className={`rounded-2xl border p-5 ${warningCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-border'}`}>
          <div className="text-xs text-muted-foreground mb-1">Need refill</div>
          <div className={`text-2xl font-semibold ${warningCount > 0 ? 'text-amber-700' : ''}`}>
            {warningCount}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="text-xs text-muted-foreground mb-1">Doses today</div>
          <div className="text-2xl font-semibold">{todayDoses}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6 flex items-center gap-3 flex-wrap">
        <Pill className="w-4 h-4 text-muted-foreground shrink-0" />
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
          className="input-field w-auto flex-1 min-w-[160px]">
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded" />
          <span className="text-muted-foreground">Show inactive</span>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No medicines added yet</h3>
          <p className="text-muted-foreground text-sm mb-6">
            Add your family's prescriptions to get reminders and refill alerts.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add first medicine
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(med => {
            const status = getRefillStatus(med)
            const daysLeft = med.remaining_quantity
              ? getDaysRemaining(med.remaining_quantity, med.times_per_day)
              : null
            const isExpanded = expandedMed === med.id

            return (
              <div key={med.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  !med.is_active ? 'opacity-60 border-border' :
                  status === 'critical' ? 'border-red-300' :
                  status === 'warning' ? 'border-amber-300' : 'border-border'
                }`}>
                {/* Main row */}
                <div className="flex items-center gap-4 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    !med.is_active ? 'bg-muted' :
                    status === 'critical' ? 'bg-red-100' :
                    status === 'warning' ? 'bg-amber-100' : 'bg-primary/10'
                  }`}>
                    <Pill className={`w-5 h-5 ${
                      !med.is_active ? 'text-muted-foreground' :
                      status === 'critical' ? 'text-red-600' :
                      status === 'warning' ? 'text-amber-600' : 'text-primary'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{med.name}</span>
                      {med.generic_name && (
                        <span className="text-xs text-muted-foreground">({med.generic_name})</span>
                      )}
                      {!med.is_active && (
                        <span className="badge bg-gray-100 text-gray-500 text-xs">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {med.dosage} · {med.frequency} · {(med.family_members as any)?.name ?? ''}
                    </div>
                    {med.reminder_times?.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {med.reminder_times.map(t => (
                          <span key={t} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Refill status */}
                  <div className="shrink-0 text-right">
                    {daysLeft !== null && (
                      <div className={`text-sm font-semibold ${
                        status === 'critical' ? 'text-red-600' :
                        status === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {med.remaining_quantity} pills
                      </div>
                    )}
                    {daysLeft !== null && (
                      <div className={`text-xs mt-0.5 ${
                        status === 'critical' ? 'text-red-500' :
                        status === 'warning' ? 'text-amber-500' : 'text-muted-foreground'
                      }`}>
                        {status !== 'ok' && (
                          <AlertCircle className="w-3 h-3 inline mr-0.5" />
                        )}
                        {daysLeft}d left
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {med.remaining_quantity !== null && med.is_active && (
                      <button onClick={() => handleMarkTaken(med)}
                        className="w-8 h-8 rounded-lg hover:bg-emerald-50 flex items-center justify-center text-muted-foreground hover:text-emerald-600 transition-colors"
                        title="Mark one dose taken">
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(med)}
                      className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      title={med.is_active ? 'Mark inactive' : 'Mark active'}>
                      {med.is_active ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setExpandedMed(isExpanded ? null : med.id)}
                      className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleDelete(med.id)} disabled={deleting === med.id}
                      className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                      {deleting === med.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {med.prescribed_by && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Prescribed by</div>
                        <div className="font-medium">{med.prescribed_by}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Start date</div>
                      <div className="font-medium">{med.start_date}</div>
                    </div>
                    {med.end_date && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">End date</div>
                        <div className="font-medium">{med.end_date}</div>
                      </div>
                    )}
                    {med.total_quantity && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Total prescribed</div>
                        <div className="font-medium">{med.total_quantity} pills</div>
                      </div>
                    )}
                    {med.notes && (
                      <div className="col-span-2 md:col-span-4">
                        <div className="text-xs text-muted-foreground mb-0.5">Notes</div>
                        <div className="text-muted-foreground text-xs leading-relaxed">{med.notes}</div>
                      </div>
                    )}
                    {status !== 'ok' && (
                      <div className="col-span-2 md:col-span-4">
                        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
                          status === 'critical'
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : 'bg-amber-50 border border-amber-200 text-amber-800'
                        }`}>
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {status === 'critical'
                            ? `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} of ${med.name} remaining. Refill urgently.`
                            : `${daysLeft} days of ${med.name} remaining. Plan your refill soon.`}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Medicine Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white">
              <h2 className="font-semibold">Add medicine</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Family member *</label>
                <select value={form.member_id}
                  onChange={e => setForm({ ...form, member_id: e.target.value })}
                  required className="input-field">
                  <option value="">Select member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Medicine name *</label>
                  <input value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Metformin" required className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Generic name</label>
                  <input value={form.generic_name}
                    onChange={e => setForm({ ...form, generic_name: e.target.value })}
                    placeholder="e.g. Metformin HCl" className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Dosage *</label>
                  <input value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })}
                    placeholder="e.g. 500mg" required className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Frequency *</label>
                  <select value={form.frequency}
                    onChange={e => handleFrequencyChange(e.target.value)}
                    className="input-field">
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              {/* Reminder times */}
              {form.reminder_times.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Reminder times</label>
                  <div className="flex gap-2 flex-wrap">
                    {form.reminder_times.map((t, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input type="time" value={t}
                          onChange={e => {
                            const times = [...form.reminder_times]
                            times[i] = e.target.value
                            setForm({ ...form, reminder_times: times })
                          }}
                          className="input-field w-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Total pills</label>
                  <input type="number" min="0" value={form.total_quantity}
                    onChange={e => setForm({ ...form, total_quantity: e.target.value })}
                    placeholder="e.g. 30" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Remaining</label>
                  <input type="number" min="0" value={form.remaining_quantity}
                    onChange={e => setForm({ ...form, remaining_quantity: e.target.value })}
                    placeholder="e.g. 30" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Alert at (days)</label>
                  <input type="number" min="1" max="30" value={form.refill_alert_at}
                    onChange={e => setForm({ ...form, refill_alert_at: e.target.value })}
                    className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Start date</label>
                  <input type="date" value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">End date</label>
                  <input type="date" value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Prescribed by</label>
                <input value={form.prescribed_by}
                  onChange={e => setForm({ ...form, prescribed_by: e.target.value })}
                  placeholder="e.g. Dr. Sharma" className="input-field" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Take after meals, avoid with dairy"
                  rows={2} className="input-field resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving || !form.member_id}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}