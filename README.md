🏥 MediTrack — Healthcare Cost Tracker & Optimizer

Track, optimize, and reduce your family's healthcare spending in India.

MediTrack is a full-stack AI-powered web app that helps Indian families take control of their medical expenses. It tracks spending across family members, compares hospital prices in real time, checks government scheme eligibility, suggests generic medicine alternatives, manages insurance policies, generates personalized diet charts, tracks vitals, sends medicine reminders, and maintains digital health records — all in one place.
🌐 Live Demo: meditrack-cyan.vercel.app

⚠️ Important: Google OAuth Setup

The "Continue with Google" button on the sign in page requires additional setup to work. Email/password signup works out of the box — use that to get started immediately.

The Google OAuth button will show an error (Unsupported provider: provider is not enabled) until you configure it. To enable it:

Go to Google Cloud Console → Create a new project
Enable the Google+ API
Go to Credentials → Create Credentials → OAuth 2.0 Client ID
Set the Authorized redirect URI to:

https://your-project-id.supabase.co/auth/v1/callback

Copy the Client ID and Client Secret
In Supabase → Authentication → Sign In / Providers → Google → paste both values → Enable → Save

Until this is configured, use email/password signup instead — it works perfectly without any extra setup.

✨ Features
👨‍👩‍👧‍👦 Family Profiles

Add and manage health profiles for every family member
Store blood group, allergies, and chronic conditions
Set an annual health budget per member — tracked on the dashboard
Click any member to view their profile and AI-generated diet chart

💸 Expense Tracking

Log medical expenses with category, hospital, doctor, and insurance coverage
Filter by family member or category
See total, out-of-pocket, and covered amounts at a glance

📊 Dashboard Analytics

Monthly spending bar chart — covered vs out-of-pocket (last 6 months)
Category donut chart — all-time spending breakdown
Live stat cards — this month, OOP, family members, insured cover
Annual health budget progress bars — per member, with over-budget alerts

💊 Medicines Tracker

Log prescriptions with dosage, frequency, and reminder times
Browser push notifications for medicine reminders at scheduled times
Refill alerts — auto-calculates days of supply remaining and alerts when low
Mark doses as taken, toggle medicines active/inactive
Stat cards — active medicines, need refill, doses today

❤️ Vitals Tracker

Log BP, blood sugar, weight, SpO2, heart rate, and temperature per member
Trend charts with normal range reference lines
Health alerts — automatic warnings when readings are outside normal range
Recent readings table with Normal / Watch / Alert status badges

🛡️ Insurance Manager

Track active policies with sum insured, premium, and renewal dates
Auto-flags expired policies with a red badge
Insurance renewal alerts on the dashboard

🥗 AI Diet Chart Generator

Select a family member + one or more health goals
AI analyses their health records, chronic conditions, allergies, and blood group
Generates a personalised 7-day Indian diet chart
Diet chart is saved to the database — persists across sessions
Supports multiple goals combined (e.g. Weight Loss + Diabetes Management)
Regenerate anytime with new goals

📋 Health Records

Store prescriptions, lab reports, discharge summaries, vaccination records
Filter by family member or record type
Notes and document links per record

🤖 AI Assistant (6 tools)
Powered by Groq (Llama 4 Scout), the assistant can:

Summarize your spending history from the database
Search live hospital prices via Tavily
Suggest generic medicine alternatives with savings %
Check eligibility for PMJAY, CGHS, ESIC, and state schemes
Log expenses via natural language
Compare hospitals for a procedure

🧾 Section 80D Tax Calculator

Auto-computes Section 80D deduction from your insurance and expense data
Breaks down: health insurance premiums + preventive checkups
Shows estimated tax saved at 20% and 30% slabs
Toggle for senior citizen parents (additional ₹50,000 limit)
Smart tips on unused deduction limits
One-click CSV download for CA / tax filing

⚙️ Settings

Edit profile (name, city, phone)
Section 80D tax deduction calculator
Export all data (expenses, family, insurance) as CSV
Privacy & security information
About section with tech stack info

🔐 Secure Auth

Email/password signup and login
Google OAuth (requires setup — see above)
Supabase Row Level Security on all tables

🛠️ Tech Stack
LayerTechnologyFrontendNext.js 14 (App Router) + Tailwind CSSUI ComponentsRadix UI + RechartsBackendNext.js API Routes (serverless)DatabaseSupabase (PostgreSQL + RLS)AuthSupabase Auth (Email + Google OAuth)AI ModelGroq — Llama 4 Scout (meta-llama/llama-4-scout-17b-16e-instruct)Live SearchTavily APIDeploymentVercel

📁 Project Structure
meditrack/
├── supabase/
│ └── schema.sql # Full DB schema — run once in Supabase SQL Editor
├── src/
│ ├── app/
│ │ ├── page.tsx # Root redirect
│ │ ├── layout.tsx # Root layout
│ │ ├── globals.css # Global styles + CSS variables
│ │ ├── auth/
│ │ │ ├── signin/ # Sign in page
│ │ │ ├── signup/ # Sign up page
│ │ │ └── callback/ # OAuth callback handler
│ │ ├── dashboard/
│ │ │ ├── page.tsx # Dashboard with charts + budget tracker
│ │ │ ├── layout.tsx # Dashboard layout with sidebar
│ │ │ ├── family/ # Family profiles + AI diet chart
│ │ │ ├── expenses/ # Expense CRUD + filters
│ │ │ ├── medicines/ # Medicine tracker + reminders
│ │ │ ├── vitals/ # Vitals tracker + trend charts
│ │ │ ├── records/ # Health records
│ │ │ ├── insurance/ # Insurance policy tracker
│ │ │ ├── assistant/ # AI chat interface
│ │ │ └── settings/ # Profile, 80D calculator, export, about
│ │ └── api/
│ │ ├── chat/ # Groq AI agent API route (6 tools)
│ │ └── diet/ # Diet chart generation API route
│ ├── components/
│ │ ├── layout/
│ │ │ └── Sidebar.tsx # Navigation sidebar
│ │ └── dashboard/
│ │ ├── SpendingChart.tsx # Monthly bar chart
│ │ ├── CategoryChart.tsx # Category donut chart
│ │ └── TaxCalculator.tsx # Section 80D calculator
│ ├── lib/
│ │ ├── supabase/
│ │ │ ├── client.ts # Browser Supabase client
│ │ │ └── server.ts # Server Supabase client
│ │ ├── tools.ts # 6 AI tool definitions + execution
│ │ └── utils.ts # Utility functions
│ ├── types/
│ │ └── index.ts # TypeScript types
│ └── middleware.ts # Auth route protection
├── .env.local.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json

🚀 Getting Started
Prerequisites

Node.js 18+
A Supabase account (free)
A Groq account (free)
A Tavily account (free tier — for live hospital price search)

Step 1 — Clone the repository
bashgit clone https://github.com/YOUR_USERNAME/meditrack.git
cd meditrack
Step 2 — Install dependencies
bashnpm install
Step 3 — Set up Supabase

Go to supabase.com and create a new project
Name it meditrack, choose region South Asia (Mumbai)
Go to SQL Editor → New Query
Open supabase/schema.sql, copy all contents, paste and click Run
You should see: Success. No rows returned
Run these additional queries one by one in new SQL editor tabs:

Diet charts table:
sqlcreate table public.diet_charts (
id uuid default uuid_generate_v4() primary key,
user_id uuid references public.profiles(id) on delete cascade not null,
member_id uuid references public.family_members(id) on delete cascade not null,
goal text not null,
summary text not null,
weekly_plan jsonb not null,
created_at timestamptz default now(),
updated_at timestamptz default now()
);
alter table public.diet_charts enable row level security;
create policy "Users manage own diet charts" on public.diet_charts
using (auth.uid() = user_id) with check (auth.uid() = user_id);
Medicines table:
sqlcreate table public.medicines (
id uuid default uuid_generate_v4() primary key,
user_id uuid references public.profiles(id) on delete cascade not null,
member_id uuid references public.family_members(id) on delete cascade not null,
name text not null,
generic_name text,
dosage text not null,
frequency text not null,
times_per_day int not null default 1,
reminder_times text[] not null default '{}',
total_quantity int,
remaining_quantity int,
refill_alert_at int default 5,
prescribed_by text,
start_date date not null default current_date,
end_date date,
is_active boolean default true,
notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
);
alter table public.medicines enable row level security;
create policy "Users manage own medicines" on public.medicines
using (auth.uid() = user_id) with check (auth.uid() = user_id);
Vitals table:
sqlcreate table public.vitals (
id uuid default uuid_generate_v4() primary key,
user_id uuid references public.profiles(id) on delete cascade not null,
member_id uuid references public.family_members(id) on delete cascade not null,
type text not null,
value numeric(8,2) not null,
value2 numeric(8,2),
unit text not null,
logged_at timestamptz default now(),
notes text
);
alter table public.vitals enable row level security;
create policy "Users manage own vitals" on public.vitals
using (auth.uid() = user_id) with check (auth.uid() = user_id);
Annual budget column:
sqlalter table public.family_members
add column annual_budget numeric(12,2) default null;
Step 4 — Get your API keys
Supabase keys:

Dashboard → Settings → API → copy Project URL and anon public key

Groq key:

Go to console.groq.com → API Keys → Create key

Tavily key (optional — for live hospital price search):

Go to tavily.com → Sign up → copy API key

Step 5 — Configure environment variables
Create a .env.local file in the project root:
env# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Groq (AI)

GROQ_API_KEY=gsk_your-groq-key-here

# Tavily (live hospital price search)

TAVILY_API_KEY=tvly-your-key-here

# App

NEXT_PUBLIC_APP_URL=http://localhost:3000
Step 6 — Run the development server
bashnpm run dev
Open http://localhost:3000

Note: Use email/password to sign up. Google OAuth requires additional Google Cloud Console setup — see the Google OAuth Setup section above.

🧭 Using the App

1. Create an account
   Sign up with email and password. Confirm via the email link.
2. Add family members
   Family → Add Member → fill in name, relation, DOB, blood group, allergies, chronic conditions, and annual health budget.
3. Track expenses
   Expenses → Add Expense → log amount, category, hospital, insurance coverage.
4. Track medicines
   Medicines → Add Medicine → log prescription, dosage, frequency, and pill count. Enable browser notifications for reminders.
5. Log vitals
   Vitals → Log Reading → track BP, blood sugar, weight, SpO2, heart rate, or temperature. Charts show trends and alert when out of normal range.
6. Add health records
   Health Records → Add Record → store prescriptions, reports, discharge summaries, vaccinations.
7. Manage insurance
   Insurance → Add Policy → track sum insured, premium, renewal date. Expired policies are auto-flagged.
8. Generate a diet chart
   Family → click a member → select health goals → Generate 7-Day Diet Chart. Saved automatically.
9. Use the AI Assistant
   AI Assistant → type naturally:
   "What did I spend on healthcare last month?"
   "Suggest generic alternatives for Augmentin and Pantoprazole"
   "What government schemes am I eligible for in Haryana?"
   "Find MRI scan price in Delhi"
   "Log ₹800 medicine expense from MedPlus today"
10. Check tax deductions
    Settings → Section 80D → auto-computed from your insurance and expense data. Download CSV for your CA.
11. Export your data
    Settings → Export as CSV → all expenses, family members, and insurance policies.

🗄️ Database Schema
TablePurposeprofilesExtends Supabase auth usersfamily_membersFamily health profiles + annual budgetexpense_categoriesSeeded categories (Consultation, Medicines, etc.)expensesAll medical expense recordsinsurance_policiesHealth insurance policieshealth_recordsPrescriptions, reports, discharge summariesdiet_chartsAI-generated 7-day diet plans per membermedicinesPrescriptions with reminder schedulesvitalsHealth metric readings with timestamps
All tables use Row Level Security (RLS) — users can only access their own data.

🤖 AI Tools
ToolWhat it doesget_spending_summaryFetches real expense data from your DBsuggest_generic_medicinesMaps brand → generic with savings %check_scheme_eligibilityChecks PMJAY, CGHS, ESIC, state schemessearch_hospital_pricesLive Tavily search for hospital pricescompare_hospitalsCompares hospitals for a procedurelog_expenseSaves expense directly to your DB

🚢 Deployment (Vercel)

Push your code to GitHub
Go to vercel.com → Import your meditrack repo
Add all environment variables from .env.local in the Vercel dashboard
Click Deploy

In Supabase, add your Vercel URL:

Authentication → URL Configuration → Site URL → https://your-app.vercel.app
Authentication → URL Configuration → Redirect URLs → https://your-app.vercel.app/**

💰 Cost
ServiceFree TierSupabase500MB DB, 50k auth usersGroq100k tokens/dayTavily1,000 searches/monthVercelUnlimited personal projects
Total cost to run as a portfolio project: ₹0

🗺️ Roadmap

OCR receipt scanner — auto-extract expense details from bill photos
"Should I?" pre-decision AI advisor
Prescription explainer — plain language medicine decoder
Crowdsourced hospital price database
Freemium Pro plan (₹99/month)
Hindi language support
PDF monthly health report
WhatsApp bot for Tier 2/3 cities
ABHA integration (India's national health ID)
B2B corporate wellness dashboard

📄 License
MIT License — free to use, modify, and distribute.

Built with ❤️ for Indian families · Powered by Next.js, Supabase, and Groq.
