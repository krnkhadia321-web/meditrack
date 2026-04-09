'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Expense, FamilyMember, ExpenseCategory } from '@/types'
import { Plus, X, Loader2, Trash2, Receipt, Filter, Camera, CheckCircle2 } from 'lucide-react'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filterMember, setFilterMember] = useState('')
const [filterCategory, setFilterCategory] = useState('')
const [scanning, setScanning] = useState(false)
const [scanResult, setScanResult] = useState<any>(null)
const [showScanReview, setShowScanReview] = useState(false)
const fileInputRef = useRef<HTMLInputElement>(null)
const supabase = createClient()

  const emptyForm = {
    description: '', amount: '', covered_amount: '0',
    expense_date: new Date().toISOString().split('T')[0],
    member_id: '', category_id: '', hospital_name: '', doctor_name: '', notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: exp }, { data: mem }, { data: cat }] = await Promise.all([
      supabase.from('expenses')
        .select('*, expense_categories(*), family_members(name, relation)')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false }),
      supabase.from('family_members').select('*').eq('user_id', user.id),
      supabase.from('expense_categories').select('*').order('name'),
    ])
    setExpenses(exp ?? [])
    setMembers(mem ?? [])
    setCategories(cat ?? [])
    setLoading(false)
  }

  async function handleScanBill(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  setScanning(true)
  setScanResult(null)

  try {
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Pre-fill the expense form with scanned data
    setForm({
      description: data.extracted.description ?? '',
      amount: data.extracted.amount ? String(data.extracted.amount) : '',
      covered_amount: '0',
      expense_date: data.extracted.expense_date ?? new Date().toISOString().split('T')[0],
      member_id: '',
      category_id: categories.find(c =>
        c.name.toLowerCase() === (data.extracted.category ?? '').toLowerCase()
      )?.id ?? '',
      hospital_name: data.extracted.hospital_name ?? '',
      doctor_name: data.extracted.doctor_name ?? '',
      notes: data.extracted.notes ?? '',
    })
    setScanResult(data.extracted)
    setShowScanReview(true)
    setShowModal(true)
  } catch (err: any) {
    alert(err.message ?? 'Failed to scan bill. Please try again with a clearer photo.')
  } finally {
    setScanning(false)
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
}

  useEffect(() => { fetchData() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('expenses').insert({
      user_id: user.id,
      description: form.description,
      amount: parseFloat(form.amount),
      covered_amount: parseFloat(form.covered_amount) || 0,
      expense_date: form.expense_date,
      member_id: form.member_id || null,
      category_id: form.category_id || null,
      hospital_name: form.hospital_name || null,
      doctor_name: form.doctor_name || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowModal(false)
    setForm(emptyForm)
    fetchData()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('expenses').delete().eq('id', id)
    setDeleting(null)
    fetchData()
  }

  const filtered = expenses.filter(e => {
    if (filterMember && e.member_id !== filterMember) return false
    if (filterCategory && e.category_id !== filterCategory) return false
    return true
  })

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0)
  const totalOOP = filtered.reduce((s, e) => s + (Number(e.amount) - Number(e.covered_amount)), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track all medical spending across your family</p>
        </div>
        <div className="flex items-center gap-3">
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    capture="environment"
    className="hidden"
    onChange={handleScanBill}
  />
  <button
    onClick={() => fileInputRef.current?.click()}
    disabled={scanning}
    className="btn-secondary flex items-center gap-2"
  >
    {scanning
      ? <Loader2 className="w-4 h-4 animate-spin" />
      : <Camera className="w-4 h-4" />}
    {scanning ? 'Scanning...' : 'Scan Bill'}
  </button>
  <button onClick={() => { setScanResult(null); setShowScanReview(false); setForm(emptyForm); setShowModal(true) }} className="btn-primary flex items-center gap-2">
    <Plus className="w-4 h-4" /> Add expense
  </button>
</div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">Total shown</div>
          <div className="text-xl font-semibold">{formatCurrency(totalFiltered)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">Out of pocket</div>
          <div className="text-xl font-semibold text-red-600">{formatCurrency(totalOOP)}</div>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <div className="text-xs text-muted-foreground mb-1">Covered by insurance</div>
          <div className="text-xl font-semibold text-emerald-600">{formatCurrency(totalFiltered - totalOOP)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6 flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <select value={filterMember} onChange={e => setFilterMember(e.target.value)}
          className="input-field w-auto flex-1 min-w-[160px]">
          <option value="">All members</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="input-field w-auto flex-1 min-w-[160px]">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        {(filterMember || filterCategory) && (
          <button onClick={() => { setFilterMember(''); setFilterCategory('') }}
            className="btn-ghost flex items-center gap-1 text-xs">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No expenses found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {expenses.length === 0 ? 'Add your first medical expense to get started.' : 'Try clearing your filters.'}
          </p>
          {expenses.length === 0 && (
            <button onClick={() => setShowModal(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add expense
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Member</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Out of pocket</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((expense) => (
                  <tr key={expense.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm">{expense.description}</div>
                      {expense.hospital_name && (
                        <div className="text-xs text-muted-foreground mt-0.5">{expense.hospital_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm">
                        {(expense.family_members as any)?.name ?? <span className="text-muted-foreground">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm">
                        {(expense.expense_categories as any)
                          ? `${(expense.expense_categories as any).icon} ${(expense.expense_categories as any).name}`
                          : <span className="text-muted-foreground">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-muted-foreground">
                      {formatDate(expense.expense_date)}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-sm">
                      {formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-red-600 font-medium">
                      {formatCurrency(Number(expense.amount) - Number(expense.covered_amount))}
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleDelete(expense.id)} disabled={deleting === expense.id}
                        className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors ml-auto">
                        {deleting === expense.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white">
              <h2 className="font-semibold">Add expense</h2>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
  {showScanReview && scanResult && (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-emerald-800">Bill scanned successfully</p>
        <p className="text-xs text-emerald-600 mt-0.5">Review and edit the fields below before saving</p>
      </div>
    </div>
  )}
  <div>
    <label className="text-sm font-medium mb-1.5 block">Description *</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. Cardiology consultation" required className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Total amount (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00" required className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Covered by insurance (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.covered_amount}
                    onChange={e => setForm({ ...form, covered_amount: e.target.value })}
                    placeholder="0.00" className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date *</label>
                <input type="date" value={form.expense_date}
                  onChange={e => setForm({ ...form, expense_date: e.target.value })}
                  required className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Family member</label>
                  <select value={form.member_id} onChange={e => setForm({ ...form, member_id: e.target.value })}
                    className="input-field">
                    <option value="">Select member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}
                    className="input-field">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Hospital / clinic</label>
                  <input value={form.hospital_name}
                    onChange={e => setForm({ ...form, hospital_name: e.target.value })}
                    placeholder="e.g. Apollo Hospital" className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Doctor name</label>
                  <input value={form.doctor_name}
                    onChange={e => setForm({ ...form, doctor_name: e.target.value })}
                    placeholder="e.g. Dr. Mehta" className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any additional notes..." rows={2}
                  className="input-field resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}