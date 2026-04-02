🏥 MediTrack — Healthcare Cost Tracker & Optimizer

Track, optimize, and reduce your family's healthcare spending in India.

MediTrack is a full-stack AI-powered web app that helps Indian families take control of their medical expenses. It tracks spending across family members, compares hospital prices in real time, checks government scheme eligibility, suggests generic medicine alternatives, manages insurance policies, generates personalized diet charts, and maintains digital health records — all in one place.
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
Click any member to view their profile and diet chart

💸 Expense Tracking

Log medical expenses with category, hospital, doctor, and insurance coverage
Filter by family member or category
See total, out-of-pocket, and covered amounts at a glance

📊 Dashboard Analytics

Monthly spending bar chart — covered vs out-of-pocket (last 6 months)
Category donut chart — all-time spending breakdown
Live stat cards — this month, OOP, family members, insured cover

🛡️ Insurance Manager

Track active policies with sum insured, premium, and renewal dates
Auto-flags expired policies with a red badge
Insurance renewal alerts on the dashboard

🥗 AI Diet Chart Generator

Select a family member + one or more health goals
AI analyses their health records, chronic conditions, allergies, and blood group
Generates a personalised 7-day Indian diet chart (dal, roti, sabzi — not western food)
Diet chart is saved to the database — persists across sessions
Supports multiple goals combined (e.g. Weight Loss + Diabetes Management)
Regenerate anytime with new goals via "Generate New Chart" button

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

⚙️ Settings

Edit profile (name, city, phone)
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
│ │ │ ├── page.tsx # Dashboard with charts
│ │ │ ├── layout.tsx # Dashboard layout with sidebar
│ │ │ ├── family/ # Family profiles + AI diet chart
│ │ │ ├── expenses/ # Expense CRUD + filters
│ │ │ ├── records/ # Health records
│ │ │ ├── insurance/ # Insurance policy tracker
│ │ │ ├── assistant/ # AI chat interface
│ │ │ └── settings/ # Profile, export, about
│ │ └── api/
│ │ ├── chat/ # Groq AI agent API route (6 tools)
│ │ └── diet/ # Diet chart generation API route
│ ├── components/
│ │ ├── layout/
│ │ │ └── Sidebar.tsx # Navigation sidebar
│ │ └── dashboard/
│ │ ├── SpendingChart.tsx # Monthly bar chart
│ │ └── CategoryChart.tsx # Category donut chart
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
Run this additional query to create the diet charts table:

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
   Sign up with email and password. Confirm via the email link sent to your inbox.
2. Add family members
   Family → Add Member → fill in name, relation, DOB, blood group, allergies, chronic conditions.
3. Track expenses
   Expenses → Add Expense → log amount, category, hospital, insurance coverage.
4. Add health records
   Health Records → Add Record → store prescriptions, reports, discharge summaries, vaccinations.
5. Manage insurance
   Insurance → Add Policy → track sum insured, premium, renewal date. Expired policies are auto-flagged.
6. Generate a diet chart
   Family → click a member → select one or more health goals → Generate 7-Day Diet Chart. The chart is saved and will be there next time you visit.
7. Use the AI Assistant
   AI Assistant → type naturally:
   "What did I spend on healthcare last month?"
   "Suggest generic alternatives for Augmentin and Pantoprazole"
   "What government schemes am I eligible for in Haryana? Income ₹4 lakh, private employee, family of 4"
   "Find MRI scan price in Delhi"
   "Compare Apollo vs Fortis for knee replacement"
   "Log ₹800 medicine expense from MedPlus today"
8. Export your data
   Settings → Export as CSV → opens a downloadable file with all expenses, family members, and insurance policies.

🗄️ Database Schema
TablePurposeprofilesExtends Supabase auth usersfamily_membersFamily health profilesexpense_categoriesSeeded categories (Consultation, Medicines, etc.)expensesAll medical expense recordsinsurance_policiesHealth insurance policieshealth_recordsPrescriptions, reports, discharge summariesdiet_chartsAI-generated 7-day diet plans per member
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

OCR receipt scanning — auto-extract expense details from photos
Push notifications — insurance renewal reminders
Export to PDF — monthly expense report
Hospital price database — India-specific crowdsourced data
Diet chart sharing — export as PDF or image
Mobile app — React Native port

📄 License
MIT License — free to use, modify, and distribute.

Built with ❤️ for Indian families · Powered by Next.js, Supabase, and Groq
