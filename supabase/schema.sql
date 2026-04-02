-- ============================================================
--  MediTrack — Supabase Schema
--  Run this entire file in your Supabase SQL Editor once.
-- ============================================================
-- Enable UUID extension
create extension if not exists "uuid-ossp";
-- ── PROFILES (extends Supabase auth.users) ──────────────────
create table public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    full_name text not null,
    city text,
    phone text,
    avatar_url text,
    created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for
select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for
update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for
insert with check (auth.uid() = id);
-- Auto-create profile on signup
create or replace function public.handle_new_user() returns trigger as $$ begin
insert into public.profiles (id, full_name)
values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', '')
    );
return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();
-- ── FAMILY MEMBERS ───────────────────────────────────────────
create table public.family_members (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    name text not null,
    relation text not null,
    date_of_birth date,
    blood_group text,
    allergies text,
    chronic_conditions text,
    created_at timestamptz default now()
);
alter table public.family_members enable row level security;
create policy "Users manage own family" on public.family_members using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ── EXPENSE CATEGORIES ───────────────────────────────────────
create table public.expense_categories (
    id uuid default uuid_generate_v4() primary key,
    name text not null unique,
    icon text not null,
    color text not null
);
insert into public.expense_categories (name, icon, color)
values ('Consultation', '🩺', '#4F8EF7'),
    ('Medicines', '💊', '#F7694F'),
    ('Diagnostics', '🔬', '#9B59B6'),
    ('Surgery', '🏥', '#E74C3C'),
    ('Physiotherapy', '🦴', '#F39C12'),
    ('Dental', '🦷', '#1ABC9C'),
    ('Vision', '👁️', '#3498DB'),
    ('Mental Health', '🧠', '#8E44AD'),
    ('Vaccination', '💉', '#27AE60'),
    ('Other', '📋', '#95A5A6');
-- ── INSURANCE POLICIES ───────────────────────────────────────
create table public.insurance_policies (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    provider_name text not null,
    policy_number text,
    plan_name text,
    sum_insured numeric(12, 2) not null default 0,
    premium_annual numeric(12, 2),
    renewal_date date,
    is_active boolean default true,
    created_at timestamptz default now()
);
alter table public.insurance_policies enable row level security;
create policy "Users manage own policies" on public.insurance_policies using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ── EXPENSES ─────────────────────────────────────────────────
create table public.expenses (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    member_id uuid references public.family_members(id) on delete
    set null,
        category_id uuid references public.expense_categories(id),
        policy_id uuid references public.insurance_policies(id) on delete
    set null,
        description text not null,
        amount numeric(12, 2) not null,
        covered_amount numeric(12, 2) default 0,
        expense_date date not null default current_date,
        hospital_name text,
        doctor_name text,
        notes text,
        receipt_url text,
        created_at timestamptz default now()
);
alter table public.expenses enable row level security;
create policy "Users manage own expenses" on public.expenses using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ── HEALTH RECORDS ───────────────────────────────────────────
create table public.health_records (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    member_id uuid references public.family_members(id) on delete cascade not null,
    record_type text not null,
    title text not null,
    file_url text,
    notes text,
    record_date date not null default current_date,
    created_at timestamptz default now()
);
alter table public.health_records enable row level security;
create policy "Users manage own records" on public.health_records using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- ── HELPFUL VIEWS ────────────────────────────────────────────
create or replace view public.monthly_summary as
select user_id,
    date_trunc('month', expense_date) as month,
    sum(amount) as total_spent,
    sum(covered_amount) as total_covered,
    sum(amount - covered_amount) as out_of_pocket,
    count(*) as expense_count
from public.expenses
group by user_id,
    date_trunc('month', expense_date);
create or replace view public.member_spending as
select e.user_id,
    e.member_id,
    fm.name as member_name,
    fm.relation,
    sum(e.amount) as total_spent,
    sum(e.covered_amount) as total_covered,
    count(*) as expense_count
from public.expenses e
    join public.family_members fm on fm.id = e.member_id
group by e.user_id,
    e.member_id,
    fm.name,
    fm.relation;