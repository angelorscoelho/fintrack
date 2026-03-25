# FinTrack AI — Copilot Instructions
# Place this file at: .github/copilot-instructions.md
# The Copilot Coding Agent reads this file at the start of every session.

## Project Overview
FinTrack AI is a Proof-of-Concept system for real-time financial fraud detection and fiscal anomaly analysis. It uses unsupervised ML (Isolation Forest) combined with Generative AI (Gemini) to produce explainable audit reports.

**Live URL:** https://www.angelorscoelho.dev/poc/fintrack  
**Repository:** https://github.com/angelorscoelho/fintrack

---

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Tables:** TanStack Table v8 (headless)
- **UI Components:** shadcn/ui (copy-paste, no bundle overhead)
- **Styling:** Tailwind CSS (utility-first)
- **Icons:** lucide-react
- **Data Fetching:** SWR with auto-revalidation
- **Routing:** React Router v6
- **Charts:** Recharts or Chart.js

### Backend
- **API:** FastAPI + uvicorn (Python 3.11, async)
- **DB:** AWS DynamoDB (boto3 client)
- **AI Orchestration:** LangGraph 0.2.x + Google Generative AI SDK
- **Models:** Gemini 1.5 Flash (XAI), Gemini 1.5 Pro (SAR drafts)

### Infrastructure (AWS Serverless)
- **Entry:** API Gateway HTTP API → SQS Standard Queue → Lambda
- **Compute:** AWS Lambda Python 3.11
- **ML:** scikit-learn Isolation Forest (in Lambda Layer)
- **IaC:** AWS SAM (template.yaml)

---

## Critical Constraints — ALWAYS FOLLOW THESE

### 1. Dark Mode
- **NEVER** use hardcoded colors: `bg-white`, `text-black`, `backgroundColor: 'white'`, `color: black`
- **ALWAYS** use shadcn/ui CSS variables: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`
- **ALWAYS** add dark variant when using Tailwind: `dark:bg-slate-900` etc.
- Test every component in both light and dark mode before completing

### 2. i18n (Internationalization)
- **NEVER** hardcode user-visible strings in components
- **ALWAYS** use the i18n system: `t('key')` from `useLanguage()` hook
- Translation files: `src/i18n/en.json` (default) and `src/i18n/pt.json`
- When adding a new string: add it to BOTH translation files simultaneously

### 3. AI Sidebar Layout Offset
- **NEVER** allow any element to overlap the AI Sidebar area (right column, 360px)
- The sidebar width is controlled by CSS variable `--sidebar-width: 360px`
- All pages and modals must be constrained to the left column
- Modals: use `max-width: calc(100% - var(--sidebar-width))` when sidebar is open
- Check `SidebarContext.isOpen` to apply the correct container width

### 4. URL State Synchronization
- **ALL** filters must be synchronized to URL query params
- Use `useSearchParams` from React Router v6
- Bidirectional sync: state → URL when filter changes, URL → state on mount
- Filter keys convention: `status`, `category`, `minScore`, `maxScore`, `dateFrom`, `dateTo`, `modal`

### 5. API Keys — Security
- **NEVER** expose Gemini API keys or any secrets in the frontend bundle
- All AI calls must go through FastAPI proxy endpoints (`POST /api/chat`, `POST /api/alerts/{id}/analyze`)
- API keys are stored in AWS SSM Parameter Store: `/fintrack/gemini_api_key`

### 6. Branch Convention
- Your branches are automatically prefixed: `copilot/`
- Human branches: `feat/US-XXX-description`, `fix/US-XXX-description`
- **NEVER** push to `main` directly — always via PR
- Reference the issue in your PR: `Fixes #XXX`

---

## File Structure

```
fintrack/
├── .github/
│   ├── copilot-instructions.md     ← this file
│   └── copilot-setup-steps.yml    ← dev environment setup
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ui/                 ← shadcn/ui base components
│       │   ├── ai-sidebar/        ← AI Sidebar (EP-07)
│       │   ├── AlertDetailModal/  ← Transaction detail modal (EP-09)
│       │   └── dashboard/         ← Dashboard cards/charts
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Transactions.jsx   ← unified transactions+alerts page
│       │   ├── Alerts.jsx         ← alias with pre-applied filters
│       │   └── Reports.jsx        ← SAR Reports
│       ├── hooks/
│       │   ├── useAlertStream.js  ← SSE hook
│       │   ├── useLanguage.js     ← i18n hook
│       │   └── useSidebarContext.js
│       ├── i18n/
│       │   ├── en.json
│       │   └── pt.json
│       ├── contexts/
│       │   ├── LanguageContext.jsx
│       │   └── SidebarContext.jsx
│       └── App.jsx                ← root layout with CSS Grid
├── backend/
│   ├── lambda_handler/
│   │   ├── handler.py             ← SQS entry point
│   │   └── ml_scorer.py           ← Isolation Forest wrapper
│   ├── api/
│   │   ├── main.py
│   │   ├── models.py              ← Pydantic response models
│   │   └── routes/
│   │       ├── alerts.py
│   │       ├── chat.py            ← AI Sidebar proxy (EP-07)
│   │       ├── resolve.py
│   │       ├── stats.py
│   │       └── stream.py          ← SSE endpoint
│   └── genai/
│       ├── graph.py               ← LangGraph workflow
│       └── nodes/
│           ├── flash_xai.py
│           └── pro_sar.py
├── data/
│   ├── generator.py
│   └── sample-transactions.json   ← mock data (MUST have realistic distribution)
└── infra/
    └── template.yaml              ← AWS SAM
```

---

## Mock Data Requirements
When creating or modifying mock data (`data/sample-transactions.json`):
- **Fraud rate:** 1.5–3.5% of total transactions (NOT 27.5%)
- **Average anomaly score:** 10–18% (NOT 43.9%)
- **Score distribution:** lognormal (most scores 5–30%, long tail for outliers)
- **Status distribution:** ~80% NORMAL, ~12% PENDING_REVIEW, ~5% RESOLVED, ~3% FALSE_POSITIVE

---

## DynamoDB Schema — transactions table
```
transaction_id    String  (PK, UUID v4)
timestamp         String  (ISO 8601 UTC)
source_country    String  (ISO 3166-1 alpha-2)
destination_country String
payment_platform  String  (bank_transfer/card_payment/digital_wallet)
merchant_nif      String  (deprecated, kept for compatibility)
amount            Number  (EUR)
category          String  (online/gas_station/electronics/restaurant/pharmacy/retail/supermarket/travel)
anomaly_score     Number  (Float 0.0–1.0)
status            String  (NORMAL/PENDING_REVIEW/RESOLVED/FALSE_POSITIVE/CONFIRMED_FRAUD)
ai_explanation    String  (JSON string: {bullets, risk_level, summary_pt})
sar_draft         String  (Markdown, only when score > 0.90)
processing_status String  (pending/xai_complete/sar_complete/error)
resolved_at       String  (ISO 8601 UTC)
resolution_type   String  (CONFIRMED_FRAUD/FALSE_POSITIVE/ESCALATED)
analyst_notes     String  (optional)
sar_exported_at   String  (ISO 8601 UTC, when SAR was exported)
```

---

## API Endpoints Reference
```
GET  /health                        → system health
GET  /api/health/gemini             → Gemini API connectivity check
GET  /api/alerts                    → paginated alerts list
GET  /api/alerts/{id}               → alert detail with AI analysis
GET  /api/alerts/stream             → SSE stream of new alerts
PUT  /api/alerts/{id}/resolve       → resolve an alert
POST /api/alerts/{id}/analyze       → trigger AI analysis on-demand
GET  /api/stats                     → KPI metrics
POST /api/chat                      → AI Sidebar chat proxy
POST /ingest                        → webhook entry point (via API Gateway)
```

---

## Anomaly Score Thresholds
```
< 0.70  → NORMAL (no AI analysis needed)
0.70–0.90 → PENDING_REVIEW (Gemini Flash XAI generated)
> 0.90  → CRITICAL (Gemini Pro SAR draft generated)
```

---

## Quality Checklist (apply to every PR)
Before marking your PR as ready for review, verify:
- [ ] Zero `console.error` or `console.warn` in browser dev mode
- [ ] All components render correctly in dark mode
- [ ] All new user-visible strings added to `en.json` AND `pt.json`
- [ ] No element overlaps the AI Sidebar area (--sidebar-width: 360px)
- [ ] Filters synchronized with URL query params (where applicable)
- [ ] Mock data distribution is realistic (not implausibly high fraud rates)
- [ ] Component tested at 1280px and 1920px viewport width


## Conflict Resolution Protocol

When you detect that your branch conflicts with another open PR:

1. **Do NOT force push** to main or any other branch
2. Run `git fetch origin main && git rebase origin/main` on your branch
3. If conflicts exist in files also modified by another open PR, 
   leave a comment tagging the human reviewer: 
   "@ângelo Conflict detected with #XXX — please advise which changes to keep"
4. Never silently discard changes from a conflicting PR
5. After rebasing successfully, push with `git push --force-with-lease`
   (never plain `--force`)