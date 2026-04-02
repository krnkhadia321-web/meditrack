export type Profile = {
  id: string
  full_name: string
  city: string | null
  phone: string | null
  avatar_url: string | null
  created_at: string
}

export type FamilyMember = {
  id: string
  user_id: string
  name: string
  relation: 'self' | 'spouse' | 'child' | 'parent' | 'other'
  date_of_birth: string | null
  blood_group: string | null
  allergies: string | null
  chronic_conditions: string | null
  created_at: string
}

export type ExpenseCategory = {
  id: string
  name: string
  icon: string
  color: string
}

export type InsurancePolicy = {
  id: string
  user_id: string
  provider_name: string
  policy_number: string | null
  plan_name: string | null
  sum_insured: number
  premium_annual: number | null
  renewal_date: string | null
  is_active: boolean
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  member_id: string | null
  category_id: string | null
  policy_id: string | null
  description: string
  amount: number
  covered_amount: number
  expense_date: string
  hospital_name: string | null
  doctor_name: string | null
  notes: string | null
  receipt_url: string | null
  created_at: string
  family_members?: FamilyMember
  expense_categories?: ExpenseCategory
  insurance_policies?: InsurancePolicy
}

export type HealthRecord = {
  id: string
  user_id: string
  member_id: string
  record_type: 'prescription' | 'report' | 'discharge' | 'vaccination' | 'other'
  title: string
  file_url: string | null
  notes: string | null
  record_date: string
  created_at: string
  family_members?: FamilyMember
}

export type MonthlySummary = {
  month: string
  total_spent: number
  total_covered: number
  out_of_pocket: number
  expense_count: number
}

export type MemberSpending = {
  member_id: string
  member_name: string
  relation: string
  total_spent: number
  total_covered: number
  expense_count: number
}