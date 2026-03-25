# REVIEW REPORT — S09R

**Session:** S09R — React Dashboard — REVIEW
**Date:** 2026-03-18
**Input:** S09E output (React Dashboard + Alerts Table)

---

## GLOBAL RESULT: APPROVED WITH FIXES

---

## CHECKLIST

### Library Compliance (Golden Rule #13)

| # | Item | Result | Notes |
|---|------|--------|-------|
| 1 | shadcn/ui `Badge` used for status and score indicators | **PASS** | `Badge` from `@/components/ui/badge` used in `ScoreBadge` (line 22), status column (line 79), and `StatsBar` (line 136) |
| 2 | shadcn/ui `Button` used for pagination | **PASS** | `Button` from `@/components/ui/button` used for ← Anterior / Próxima → (lines 166-173) |
| 3 | shadcn/ui `Select` used for status filter | **PASS** | `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` used in App.jsx (lines 83-95) |
| 4 | lucide-react used for ALL icons | **FAIL → FIXED** | STATUS_CONFIG used emoji strings (`⏳`,`✅`,`🔵`,`✓`,`⏸`) as icons in JSX Badge. Replaced with lucide-react: `Clock`, `CheckCircle2`, `CircleDot`, `Check`, `PauseCircle` |
| 5 | sonner `<Toaster>` present in App.jsx root | **PASS** | `<Toaster position="top-right" richColors />` at line 49 |
| 6 | No `style={{}}` props | **PASS** | Zero occurrences of inline style props found. All styling via Tailwind classes |

### Functionality

| # | Item | Result | Notes |
|---|------|--------|-------|
| 7 | `npm run dev` starts cleanly | **PASS** | Vite dev server starts on port 5173. API errors expected without backend |
| 8 | All 7 columns present | **PASS** | ID, Data/Hora, NIF, Montante, Categoria, Risco, Estado — all present in COLUMNS array |
| 9 | Default sort: anomaly_score descending | **PASS** | `useState([{ id: 'anomaly_score', desc: true }])` at line 89 |
| 10 | Score badge colors correct | **FAIL → FIXED** | `s > 0.70` missed score=0.70 (PRD: "0.70 ≤ score → PENDING_REVIEW"). Fixed to `s >= 0.70` |
| 11 | `rate_limited` in STATUS_CONFIG with ⏸ label | **PASS** | `rate_limited: { label: 'Limite API', variant: 'outline', Icon: PauseCircle }` |
| 12 | StatsBar shows `rate_limited` count | **PASS** | `{ label: 'Limite API', value: stats.rate_limited, color: 'outline' }` in StatsBar |
| 13 | Select filter updates apiStatus correctly | **PASS** | `statusFilter === 'all' ? '' : statusFilter` → used in SWR URL |
| 14 | SWR refreshInterval = 0 when isIdle | **PASS** | `refreshInterval: isIdle ? 0 : 8000` for alerts, `isIdle ? 0 : 15000` for stats |
| 15 | isConnected state passed and shown | **PASS** | `useAlertStream(handleNewAlert, isIdle, setIsConnected)` + Wifi/WifiOff icons in header |
| 16 | InactivityOverlay present with correct props | **PASS** | `<InactivityOverlay isVisible={isIdle} onResume={handleResume} />` at line 119 |

### Empty/Loading States

| # | Item | Result | Notes |
|---|------|--------|-------|
| 17 | Loading state animated placeholder | **PASS** | "A carregar alertas…" with `animate-pulse` class (lines 102-107) |
| 18 | Empty results show message | **PASS** | "Sem alertas para o filtro selecionado." (lines 110-115) |

---

## ISSUES

### MAJOR #1 — Emoji used as icons in JSX (AlertsTable.jsx) — FIXED
- **Location:** `AlertsTable.jsx` lines 11-17, 79
- **Problem:** `STATUS_CONFIG` used emoji strings (`'⏳'`, `'✅'`, `'🔵'`, `'✓'`, `'⏸'`) rendered as `<span>{cfg.icon}</span>` inside Badge JSX. Violates PRD Golden Rule #13: "lucide-react used for ALL icons (no emoji as icons in JSX, only in text labels)".
- **Fix:** Replaced all emoji icons with lucide-react components: `Clock`, `CheckCircle2`, `CircleDot`, `Check`, `PauseCircle`. Changed `icon` string property to `Icon` component reference. Updated render to `<StatusIcon className="h-3 w-3" />`.

### MAJOR #2 — ScoreBadge threshold boundary mismatch with PRD (AlertsTable.jsx) — FIXED
- **Location:** `AlertsTable.jsx` line 21
- **Problem:** `s > 0.70` means score=0.70 exactly gets `outline` (Normal appearance). PRD states: "0.70 ≤ score ≤ 0.90 → PENDING_REVIEW + Gemini Flash XAI". Score 0.70 should appear as `warning`.
- **Fix:** Changed `s > 0.70` to `s >= 0.70`.

### MINOR #1 — Raw `<button>` for sort header toggles (AlertsTable.jsx)
- **Location:** `AlertsTable.jsx` line 130
- **Problem:** Table header sort toggles use raw `<button>` element instead of shadcn/ui `Button`.
- **Assessment:** Acceptable for table header structural elements. These are not user-facing action buttons.
- **Action:** Not fixed — acceptable in context.

### MINOR #2 — Unnecessary useMemo wrapping (AlertsTable.jsx)
- **Location:** `AlertsTable.jsx` line 92
- **Problem:** `data: useMemo(() => data, [data])` is a no-op memo — it returns the same reference unchanged.
- **Assessment:** Code quality issue, no functional impact.
- **Action:** Not fixed — cosmetic only.

---

## CORRECTED FILES
- `frontend/src/components/AlertsTable.jsx` — 2 MAJOR fixes applied (lucide-react icons + ScoreBadge threshold)

---

## VERIFICATION
- `npm run build` ✅ passes after all fixes
- `npm run dev` ✅ starts cleanly on port 5173
- No console errors from React/Vite (API errors expected without backend)
- All 18 checklist items now PASS

---

## NOTES FOR S10E

### Component Signatures (confirmed)
- `InactivityOverlay` props: `{ isVisible: bool, onResume: () => void }`
- `AlertDetail` props: `{ alert, open, onClose, onResolved }`
- `useAlertStream` signature: `(onNewAlert, isIdle, setIsConnected)`
- `useInactivityTimer` signature: `(timeoutMs) → { isIdle, resetTimer }`

### shadcn/ui Components Available
- `Dialog` — available at `@/components/ui/dialog` — **use for InactivityOverlay**
- `Sheet` — available at `@/components/ui/sheet` — use for AlertDetail side panel
- `Badge` — has variants: default, secondary, destructive, outline, warning, success
- `Button` — has variants: default, destructive, outline, secondary, ghost, link
- `Card` — standard shadcn/ui card
- `Select` — already used for status filter
- `Alert` — available at `@/components/ui/alert`

### STATUS_CONFIG (updated)
```javascript
const STATUS_CONFIG = {
  PENDING_REVIEW: { label: 'Pendente',      variant: 'warning',     Icon: Clock },
  RESOLVED:       { label: 'Resolvido',     variant: 'success',     Icon: CheckCircle2 },
  FALSE_POSITIVE: { label: 'Falso Positivo',variant: 'secondary',   Icon: CircleDot },
  NORMAL:         { label: 'Normal',        variant: 'outline',     Icon: Check },
  rate_limited:   { label: 'Limite API',    variant: 'outline',     Icon: PauseCircle },
}
```

### Key Architecture Points
- SWR polling pauses when `isIdle === true` (`refreshInterval: 0`)
- Vite proxy: `/api` → `http://localhost:8000`
- `@` alias → `./src` in vite.config.js
- CSS variables for shadcn/ui theme in `src/index.css`
- `cn()` utility at `@/lib/utils` for className merging

### Emoji Usage Clarification
- Emojis are **allowed** in text labels (e.g., SelectItem text: `"⏳ Pendente Revisão"`)
- Emojis are **NOT allowed** as icon elements in JSX — must use lucide-react components
