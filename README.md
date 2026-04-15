# 🏥 MediTrack — Healthcare Cost Tracker & Optimizer

Track, optimize, and reduce your family's healthcare spending in India.

MediTrack is a full-stack AI-powered web app that helps Indian families take control of their medical expenses. It tracks spending across family members, compares hospital prices in real time, checks government scheme eligibility, suggests generic medicine alternatives, manages insurance policies, generates personalised diet charts, tracks vitals, sends medicine reminders, scans bills with OCR, gives pre-decision recommendations on procedures, finds Jan Aushadhi stores, and maintains digital health records — all in one place.

🌐 **Live Demo:** [meditrack-cyan.vercel.app](https://meditrack-cyan.vercel.app)

---

## ⚠️ Important: Google OAuth Setup

The "Continue with Google" button on the sign in page requires additional setup to work. Email/password signup works out of the box — use that to get started immediately.

The Google OAuth button will show an error (`Unsupported provider: provider is not enabled`) until you configure it. To enable it:

1. Go to Google Cloud Console → Create a new project
2. Enable the Google+ API
3. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
4. Set the Authorized redirect URI to: `https://your-project-id.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase → Authentication → Sign In / Providers → Google → paste both values → Enable → Save

Until this is configured, use email/password signup instead — it works perfectly without any extra setup.

---

## ✨ Features

### 👨‍👩‍👧‍👦 Family Profiles
- Add and manage health profiles for every family member
- Store blood group, allergies, and chronic conditions
- Set an annual health budget per member — tracked on the dashboard
- Click any member to view their profile and AI-generated diet chart

### 💸 Expense Tracking
- Log medical expenses with category, hospital, doctor, and insurance coverage
- Filter by family member or category
- See total, out-of-pocket, and covered amounts at a glance

### 📷 OCR Bill Scanner
- Snap a photo of any medical bill — Tesseract.js extracts text in the browser
- Groq parses the text into structured fields (amount, date, hospital, category)
- Pre-fills the expense form so you can review and save in seconds
- Available on Expenses, Health Records, Medicines, and Vitals pages

### 📊 Dashboard Analytics
- Monthly spending bar chart — covered vs out-of-pocket (last 6 months)
- Category donut chart — all-time spending breakdown
- Live stat cards — this month, OOP, family members, insured cover
- Annual health budget progress bars — per member, with over-budget alerts
- Family Health Score — composite score from vitals, recency, and chronic conditions
- "Should I?" quick-access card linking to the pre-decision advisor

### 💊 Medicines Tracker
- Log prescriptions with dosage, frequency, and reminder times
- Browser push notifications for medicine reminders at scheduled times
- Refill alerts — auto-calculates days of supply remaining and alerts when low
- Mark doses as taken, toggle medicines active/inactive
- Stat cards — active medicines, need refill, doses today

### 📋 Prescription Explainer
- Paste or scan a prescription (handwritten or printed)
- AI explains each medicine in plain language: what it treats, dosage, side effects
- Flags interactions and asks the user to verify with their doctor

### 🏪 Jan Aushadhi Store Finder
- Find Pradhan Mantri Jan Aushadhi Kendras in your city
- Live Tavily-powered search returns store name, address, area, and phone
- Helps users locate the cheapest source for generic medicines

### ❤️ Vitals Tracker
- Log BP, blood sugar, weight, SpO2, heart rate, and temperature per member
- Trend charts with normal range reference lines
- Health alerts — automatic warnings when readings are outside normal range
- Recent readings table with Normal / Watch / Alert status badges
- Vitals can also be scanned from a report image

### 🛡️ Insurance Manager
- Track active policies with sum insured, premium, and renewal dates
- Auto-flags expired policies with a red badge
- Insurance renewal alerts on the dashboard

### 🥗 AI Diet Chart Generator
- Select a family member + one or more health goals
- AI analyses their health records, chronic conditions, allergies, and blood group
- Generates a personalised 7-day Indian diet chart
- Diet chart is saved to the database — persists across sessions
- Supports multiple goals combined (e.g. Weight Loss + Diabetes Management)
- Regenerate anytime with new goals

### 📋 Health Records
- Store prescriptions, lab reports, discharge summaries, vaccination records
- Filter by family member or record type
- Notes and document links per record
- OCR scan to import records from images

### 🤔 "Should I?" Pre-Decision Advisor
Get a personalised recommendation **before** spending on a procedure. The advisor:
- Pulls your active insurance and remaining cover
- Pulls your monthly spend so far for budget context
- Runs three live Tavily searches: market prices, named affordable hospitals in your city, and government/PMJAY options
- Returns a verdict (Good to Proceed / Caution / Consider Alternatives) with 4–5 ranked hospital options in your city
- Falls back to nearby cities by distance (NCR, MMR, Bangalore-Mysore corridor, etc.) if same-city options are thin

### 🤖 AI Assistant (6 tools)
Powered by Groq (Llama 4 Scout), the assistant can:
- Summarise your spending history from the database
- Search live hospital prices via Tavily
- Suggest generic medicine alternatives with savings %
- Check eligibility for PMJAY, CGHS, ESIC, and state schemes
- Log expenses via natural language
- Compare hospitals for a procedure

Tool results render as structured cards — colour-coded per tool, with clickable scheme links.

### 🧾 Section 80D Tax Calculator
- Auto-computes Section 80D deduction from your insurance and expense data
- Breaks down: health insurance premiums + preventive checkups
- Shows estimated tax saved at 20% and 30% slabs
- Toggle for senior citizen parents (additional ₹50,000 limit)
- Smart tips on unused deduction limits
- One-click CSV download for CA / tax filing

### ⚙️ Settings (Tabbed)
Vertical-tab layout with five sections:
- **Section 80D** — tax deduction calculator
- **Profile** — edit name, city, phone
- **Privacy & Security** — RLS, encryption, AI privacy + CSV export
- **About MediTrack** — version, stack, model, made for India
- **Sign out** — confirmation panel before ending the session

### 🔐 Secure Auth
- Email/password signup and login
- Google OAuth (requires setup — see above)
- Supabase Row Level Security on all tables

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| UI Components | Radix UI + Recharts + Lucide Icons |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (Email + Google OAuth) |
| AI Model | Groq — Llama 4 Scout (`meta-llama/llama-4-scout-17b-16e-instruct`) |
| Live Search | Tavily API |
| OCR | Tesseract.js (client-side) + Groq parsing |
| Deployment | Vercel |

---

## 📁 Project Structure

```
meditrack/
├── supabase/
│   └── schema.sql                     # Full DB schema — run once in Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Root redirect
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles + CSS variables
│   │   ├── auth/
│   │   │   ├── signin/                # Sign in page
│   │   │   ├── signup/                # Sign up page
│   │   │   └── callback/              # OAuth callback handler
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Dashboard with charts + budget tracker
│   │   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   │   ├── family/                # Family profiles + AI diet chart
│   │   │   ├── expenses/              # Expense CRUD + filters + OCR scan
│   │   │   ├── medicines/             # Medicine tracker + reminders + Rx explainer + Jan Aushadhi
│   │   │   ├── vitals/                # Vitals tracker + trend charts + scan
│   │   │   ├── records/               # Health records + scan
│   │   │   ├── insurance/             # Insurance policy tracker
│   │   │   ├── assistant/             # AI chat interface
│   │   │   ├── advisor/               # "Should I?" pre-decision advisor
│   │   │   └── settings/              # Tabbed settings (80D, Profile, Privacy, About, Sign out)
│   │   └── api/
│   │       ├── chat/                  # Groq AI agent API route (6 tools)
│   │       ├── advisor/               # Pre-decision advisor API
│   │       ├── diet/                  # Diet chart generation API
│   │       ├── ocr/                   # OCR text → structured fields
│   │       ├── prescription/          # Prescription explainer API
│   │       ├── jan-aushadhi/          # Jan Aushadhi store search API
│   │       └── health-score/          # Family health score API
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx            # Navigation sidebar
│   │   └── dashboard/
│   │       ├── SpendingChart.tsx      # Monthly bar chart
│   │       ├── CategoryChart.tsx      # Category donut chart
│   │       └── TaxCalculator.tsx      # Section 80D calculator
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   └── server.ts              # Server Supabase client (async)
│   │   ├── tools.ts                   # 6 AI tool definitions + execution
│   │   └── utils.ts                   # Utility functions
│   ├── types/
│   │   └── index.ts                   # TypeScript types
│   └── middleware.ts                  # Auth route protection
├── .env.local.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account (free)
- A Groq account (free)
- A Tavily account (free tier — for live hospital price search)

### Step 1 — Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/meditrack.git
cd meditrack
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Name it `meditrack`, choose region South Asia (Mumbai)
3. Go to SQL Editor → New Query
4. Open `supabase/schema.sql`, copy all contents, paste and click Run
5. You should see: `Success. No rows returned`
6. Run these additional queries one by one in new SQL editor tabs:

**Diet charts table:**
```sql
create table public.diet_charts (
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
```

**Medicines table:**
```sql
create table public.medicines (
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
```

**Vitals table:**
```sql
create table public.vitals (
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
```

**Annual budget column:**
```sql
alter table public.family_members
  add column annual_budget numeric(12,2) default null;
```

### Step 4 — Get your API keys

**Supabase keys:** Dashboard → Settings → API → copy Project URL and anon public key

**Groq key:** Go to [console.groq.com](https://console.groq.com) → API Keys → Create key

**Tavily key (required for advisor + Jan Aushadhi + hospital search):** Go to [tavily.com](https://tavily.com) → Sign up → copy API key

### Step 5 — Configure environment variables
Create a `.env.local` file in the project root:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Groq (AI)
GROQ_API_KEY=gsk_your-groq-key-here

# Tavily (live search)
TAVILY_API_KEY=tvly-your-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6 — Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** Use email/password to sign up. Google OAuth requires additional Google Cloud Console setup — see the Google OAuth Setup section above.

---

## 🧭 Using the App

1. **Create an account** — Sign up with email and password. Confirm via the email link.
2. **Add family members** — Family → Add Member → fill in name, relation, DOB, blood group, allergies, chronic conditions, and annual health budget.
3. **Track expenses** — Expenses → Add Expense (or scan a bill) → log amount, category, hospital, insurance coverage.
4. **Track medicines** — Medicines → Add Medicine → log prescription, dosage, frequency, and pill count. Enable browser notifications for reminders.
5. **Explain a prescription** — Medicines → Prescription Explainer tab → paste or scan, get plain-language breakdown.
6. **Find Jan Aushadhi stores** — Medicines → Find Jan Aushadhi tab → enter your city → see nearby Kendras with addresses and phone.
7. **Log vitals** — Vitals → Log Reading → track BP, blood sugar, weight, SpO2, heart rate, or temperature. Charts show trends and alert when out of normal range.
8. **Add health records** — Health Records → Add Record (or scan) → store prescriptions, reports, discharge summaries, vaccinations.
9. **Manage insurance** — Insurance → Add Policy → track sum insured, premium, renewal date. Expired policies are auto-flagged.
10. **Generate a diet chart** — Family → click a member → select health goals → Generate 7-Day Diet Chart. Saved automatically.
11. **Ask "Should I?"** — Should I? → describe a procedure (e.g. "Apollo quoted ₹8,000 for an MRI") → get a verdict + ranked options in your city.
12. **Use the AI Assistant** — AI Assistant → type naturally:
    - "What did I spend on healthcare last month?"
    - "Suggest generic alternatives for Augmentin and Pantoprazole"
    - "What government schemes am I eligible for in Haryana?"
    - "Find MRI scan price in Delhi"
    - "Log ₹800 medicine expense from MedPlus today"
13. **Check tax deductions** — Settings → Section 80D → auto-computed from your insurance and expense data. Download CSV for your CA.
14. **Export your data** — Settings → Privacy & Security → Export as CSV → all expenses, family members, and insurance policies.

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Extends Supabase auth users |
| `family_members` | Family health profiles + annual budget |
| `expense_categories` | Seeded categories (Consultation, Medicines, etc.) |
| `expenses` | All medical expense records |
| `insurance_policies` | Health insurance policies |
| `health_records` | Prescriptions, reports, discharge summaries |
| `diet_charts` | AI-generated 7-day diet plans per member |
| `medicines` | Prescriptions with reminder schedules |
| `vitals` | Health metric readings with timestamps |

All tables use Row Level Security (RLS) — users can only access their own data.

---

## 🤖 AI Tools (Assistant)

| Tool | What it does |
|------|--------------|
| `get_spending_summary` | Fetches real expense data from your DB |
| `suggest_generic_medicines` | Maps brand → generic with savings % |
| `check_scheme_eligibility` | Checks PMJAY, CGHS, ESIC, state schemes |
| `search_hospital_prices` | Live Tavily search for hospital prices |
| `compare_hospitals` | Compares hospitals for a procedure |
| `log_expense` | Saves expense directly to your DB |

Plus dedicated AI endpoints: `/api/advisor` (pre-decision), `/api/diet` (diet chart), `/api/prescription` (Rx explainer), `/api/ocr` (bill text → fields), `/api/jan-aushadhi` (store finder), `/api/health-score` (family health score).

---

## 🚢 Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your `meditrack` repo
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Click Deploy

In Supabase, add your Vercel URL:
- Authentication → URL Configuration → Site URL → `https://your-app.vercel.app`
- Authentication → URL Configuration → Redirect URLs → `https://your-app.vercel.app/**`

---

## 💰 Cost

| Service | Free Tier |
|---------|-----------|
| Supabase | 500MB DB, 50k auth users |
| Groq | 100k tokens/day |
| Tavily | 1,000 searches/month |
| Vercel | Unlimited personal projects |

**Total cost to run as a portfolio project: ₹0**

---

## 🗺️ Roadmap

- Crowdsourced hospital price database
- Freemium Pro plan (₹99/month)
- Hindi language support
- PDF monthly health report
- WhatsApp bot for Tier 2/3 cities
- ABHA integration (India's national health ID)
- B2B corporate wellness dashboard
- Insurance comparison + referral engine

---

## 📄 License

MIT License — free to use, modify, and distribute.

Built with ❤️ for Indian families · Powered by Next.js, Supabase, and Groq.
