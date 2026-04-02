# 🏥 MediTrack — Healthcare Cost Tracker & Optimizer

> **Track, optimize, and reduce your family's healthcare spending in India.**

MediTrack is a full-stack AI-powered web app that helps Indian families take control of their medical expenses. It tracks spending across family members, compares hospital prices in real time, checks government scheme eligibility, suggests generic medicine alternatives, and manages insurance policies — all in one place.

---

## ✨ Features

- 👨‍👩‍👧‍👦 **Family Profiles** — Add and manage health profiles for every family member including blood group, allergies, and chronic conditions
- 💸 **Expense Tracking** — Log medical expenses with category, hospital, doctor, and insurance coverage details
- 📊 **Dashboard Analytics** — Visual charts showing monthly spending trends and category breakdowns
- 🛡️ **Insurance Manager** — Track active policies, sum insured, premiums, and renewal dates with expiry alerts
- 🤖 **AI Assistant (6 tools)** — Powered by Groq (Llama 4), the assistant can:
  - Summarize your spending history
  - Search live hospital prices (via Tavily)
  - Suggest generic medicine alternatives with savings %
  - Check eligibility for PMJAY, CGHS, ESIC, and state schemes
  - Log expenses via natural language
  - Compare hospitals for procedures
- 🔐 **Secure Auth** — Email/password + Google OAuth via Supabase
- 🇮🇳 **India-first** — INR currency, Indian government schemes, Jan Aushadhi stores, India-specific hospital data

---

## 🛠️ Tech Stack

| Layer         | Technology                                                       |
| ------------- | ---------------------------------------------------------------- |
| Frontend      | Next.js 14 (App Router) + Tailwind CSS                           |
| UI Components | shadcn/ui + Radix UI + Recharts                                  |
| Backend       | Next.js API Routes (serverless)                                  |
| Database      | Supabase (PostgreSQL + RLS)                                      |
| Auth          | Supabase Auth (Email + Google OAuth)                             |
| AI Model      | Groq — Llama 4 Scout (meta-llama/llama-4-scout-17b-16e-instruct) |
| Live Search   | Tavily API                                                       |
| Deployment    | Vercel                                                           |

---

## 📁 Project Structure

```
meditrack/
├── supabase/
│   └── schema.sql              # Full DB schema — run once in Supabase SQL Editor
├── src/
│   ├── app/
│   │   ├── page.tsx            # Root redirect
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles + CSS variables
│   │   ├── auth/
│   │   │   ├── signin/         # Sign in page
│   │   │   ├── signup/         # Sign up page
│   │   │   └── callback/       # OAuth callback handler
│   │   ├── dashboard/
│   │   │   ├── page.tsx        # Dashboard with charts
│   │   │   ├── layout.tsx      # Dashboard layout with sidebar
│   │   │   ├── family/         # Family member profiles
│   │   │   ├── expenses/       # Expense CRUD + filters
│   │   │   ├── insurance/      # Insurance policy tracker
│   │   │   └── assistant/      # AI chat interface
│   │   └── api/
│   │       └── chat/           # Groq AI agent API route
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx     # Navigation sidebar
│   │   └── dashboard/
│   │       ├── SpendingChart.tsx   # Monthly bar chart
│   │       └── CategoryChart.tsx   # Category donut chart
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser Supabase client
│   │   │   └── server.ts       # Server Supabase client
│   │   ├── tools.ts            # 6 AI tool definitions + execution
│   │   └── utils.ts            # Utility functions (formatCurrency, etc.)
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── middleware.ts           # Auth route protection
├── .env.local.example          # Environment variable template
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free)
- A [Groq](https://console.groq.com) account (free)
- A [Tavily](https://tavily.com) account (free tier — for live hospital price search)

---

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
2. Name it `meditrack`, choose region **South Asia (Mumbai)** for best performance in India
3. Once provisioned, go to **SQL Editor** → **New Query**
4. Open `supabase/schema.sql`, copy all contents, paste and click **Run**
5. You should see: `Success. No rows returned`

### Step 4 — Get your API keys

**Supabase keys:**

- Dashboard → Settings → API
- Copy **Project URL** and **anon public key**

**Groq key:**

- Go to [console.groq.com](https://console.groq.com)
- API Keys → Create key

**Tavily key (optional — for live hospital price search):**

- Go to [tavily.com](https://tavily.com)
- Sign up → copy API key

### Step 5 — Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Groq (AI)
GROQ_API_KEY=gsk_your-groq-key-here

# Tavily (live hospital price search)
TAVILY_API_KEY=tvly-your-key-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 6 — Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the sign in page.

---

## 🧭 Using the App

### 1. Create an account

Sign up with your email or use Google OAuth. A confirmation email will be sent — click the link to activate.

### 2. Add family members

Go to **Family** → Add Member. Fill in name, relation, date of birth, blood group, and any chronic conditions or allergies.

### 3. Track expenses

Go to **Expenses** → Add Expense. Log the description, amount, insurance coverage, category, hospital, and doctor. Use filters to view by member or category.

### 4. Manage insurance

Go to **Insurance** → Add Policy. Track your sum insured, premium, policy number, and renewal date. The app will auto-flag expired policies.

### 5. Use the AI Assistant

Go to **AI Assistant** and type naturally. Example prompts:

```
"What did I spend on healthcare last month?"
"Suggest generic alternatives for Augmentin and Pantoprazole"
"What government schemes am I eligible for in Haryana? Income ₹4 lakh, private employee, family of 4"
"Find MRI scan price in Delhi"
"Compare Apollo vs Fortis for knee replacement"
"Log ₹800 medicine expense from MedPlus today"
```

### 6. View dashboard

The **Dashboard** shows:

- This month's total spend, out-of-pocket, family members, and insured cover
- Monthly spending bar chart (last 6 months — covered vs out-of-pocket)
- Category donut chart (all-time breakdown)
- Recent expenses list

---

## 🗄️ Database Schema

| Table                | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `profiles`           | Extends Supabase auth users                       |
| `family_members`     | Family health profiles                            |
| `expense_categories` | Seeded categories (Consultation, Medicines, etc.) |
| `expenses`           | All medical expense records                       |
| `insurance_policies` | Health insurance policies                         |
| `health_records`     | Medical documents and reports                     |

All tables use **Row Level Security (RLS)** — users can only access their own data.

---

## 🤖 AI Tools

The AI assistant has access to 6 tools:

| Tool                        | What it does                            |
| --------------------------- | --------------------------------------- |
| `get_spending_summary`      | Fetches real expense data from your DB  |
| `suggest_generic_medicines` | Maps brand → generic with savings %     |
| `check_scheme_eligibility`  | Checks PMJAY, CGHS, ESIC, state schemes |
| `search_hospital_prices`    | Live Tavily search for hospital prices  |
| `compare_hospitals`         | Compares hospitals for a procedure      |
| `log_expense`               | Saves expense directly to your DB       |

---

## 🚢 Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your `meditrack` repo
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Click **Deploy**

In Supabase, add your Vercel URL to the allowed redirect URLs:

- Authentication → URL Configuration → Add `https://your-app.vercel.app/**`

---

## 💰 Cost

| Service  | Free Tier                   |
| -------- | --------------------------- |
| Supabase | 500MB DB, 50k auth users    |
| Groq     | 100k tokens/day             |
| Tavily   | 1,000 searches/month        |
| Vercel   | Unlimited personal projects |

**Total cost to run as a portfolio project: ₹0**

---

## 🗺️ Roadmap

- [ ] Health Records — upload prescriptions and reports
- [ ] OCR receipt scanning — auto-extract expense details from photos
- [ ] Push notifications — insurance renewal reminders
- [ ] Export to PDF — monthly expense report
- [ ] Hospital price database — India-specific crowdsourced data
- [ ] Mobile app — React Native port

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

Built with ❤️ for Indian families · Powered by Next.js, Supabase, and Groq
