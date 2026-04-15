---
name: MediTrack project overview
description: Full-stack healthcare cost tracker for Indian families — stack, features built, and phase roadmap
type: project
---

**Project**: MediTrack — AI-powered healthcare cost tracker for Indian families. Portfolio/sellable app.

**Stack**: Next.js 14 App Router, Tailwind + shadcn/ui, Supabase (Postgres + Auth + RLS), Groq SDK (`meta-llama/llama-4-scout-17b-16e-instruct`), Tavily for live search, Recharts, Vercel deploy. Sora + JetBrains Mono fonts, emerald/teal theme.

**Supabase tables**: profiles, family_members, expense_categories (seeded 10), insurance_policies, expenses, health_records, diet_charts. RLS enforced by user_id.

**Current sidebar navItems (9 entries — DO NOT forget Medicines/Vitals)**:
- /dashboard (LayoutDashboard)
- /dashboard/family (Users)
- /dashboard/expenses (Receipt)
- /dashboard/medicines (Pill)
- /dashboard/vitals (Activity)
- /dashboard/records (FileText)
- /dashboard/insurance (Shield)
- /dashboard/assistant (Bot)
- /dashboard/advisor (Brain)

**Phase 1 complete**: Auth, family CRUD, expenses CRUD w/ categories, insurance tracker w/ auto-expired badge, dashboard w/ stat cards + SpendingChart (stacked bar last 6mo) + CategoryChart (donut top 6), recent expenses, AI Assistant (6 tools: get_spending_summary, suggest_generic_medicines, check_scheme_eligibility, log_expense, search_hospital_prices, compare_hospitals) w/ structured ToolCards (emerald/blue/purple/teal per tool, clickable scheme links). Diet charts w/ DB persistence. Medicines + Vitals pages. Health records page.

**Phase 2 started**: "Should I?" pre-decision advisor at `/dashboard/advisor` + `/api/advisor/route.ts`. Groq agent w/ `pre_decision_advisor` tool pulling insurance + monthly spend + member context + 3 Tavily searches (market prices, affordable in-city options, govt/PMJAY). Verdict banner auto-colored by keyword match. Quick-access gradient card on dashboard linking to advisor.

**Phase 2 remaining**: 3-tier distance-based hospital recommendation (same city → nearby ordered by distance → national fallback) was mid-discussion at cut-off. Also OCR receipt scanner, AI intelligence layer features.

**Phase 3**: Crowdsourced price DB moat, ₹99/mo freemium (Razorpay), Hindi i18n (next-intl), PDF monthly reports (@react-pdf/renderer).

**Phase 4**: WhatsApp bot (Meta Cloud API), ABHA integration, B2B corporate dashboard, insurance referral engine.

**Build/deploy gotchas solved**:
- `createClient()` in `lib/supabase/server.ts` is **async** — must `await createClient()` everywhere (api routes, layouts, pages, tools.ts getSpendingSummary + logExpense)
- Cookie methods typed with `CookieMethodsServer` in both server.ts and middleware.ts
- Groq passes numeric tool params as strings — always declare `type: 'string'` in schema + coerce with `Number(x)` inside executor (applies to amount, covered_amount, annual_income, family_size, quoted_price)
- Chat route uses `tool_choice: 'auto'` first call then `'none'` in agentic loop to prevent duplicate tool calls
- System prompt must include: "Never show reasoning steps, chain of thought, or ## headings"
- Limit message history to last 6 to avoid Groq rate limits
- Decommissioned Groq models hit: `llama-3.3-70b-versatile`, `llama3-70b-8192`, `llama3-groq-70b-8192-tool-use-preview`. Current working: `meta-llama/llama-4-scout-17b-16e-instruct`
- JSX paste corruption: `<a>` tags get stripped on copy; keep opening tag + href on single line
- `.gitignore` excludes `.env.local` — Vercel env vars set separately

**API keys in use**: GROQ_API_KEY, TAVILY_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY. ANTHROPIC_API_KEY present but unused (user declined paying $5).
