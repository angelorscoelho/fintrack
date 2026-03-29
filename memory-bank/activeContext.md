# Active Context

> Short-term memory. Update with UMB command at end of each session.
> Roo reads this at session start to resume without re-investigation.

## Current Focus
Dashboard Command Center: **Card 9 (High Risk Transactions / `LiveAlertFeed`)** — US-017 & US-018 fixes on branch `feat/us-017-us-018-high-risk-card`; uncommitted changes in `LiveAlertFeed.jsx` + i18n.

## Recent Changes
- [2026-03-28] Agent: **Volume chart** (merged on `main`): stacked 24h volume by tier (Normal / Suspicious / Critical), Recharts, tier chips, rolling window, no fraud-rate line; `VolumeChart.jsx`, `CommandCenter`, i18n.
- [2026-03-28] Agent: **Card 9** — filter `PENDING_REVIEW` + `anomaly_score >= 0.70`, exclude NORMAL/RESOLVED/FALSE_POSITIVE; sort score DESC then timestamp DESC; tier filter chips; counter = visible count; abbreviated tx id, €, badges (destructive + scoped `--high-risk-suspicious*` on Card), VIEW → `TransactionDetailModal`; empty states + i18n. **Branch created from `main`:** `feat/us-017-us-018-high-risk-card`.

## Next Steps
1. Review unstaged diffs on `feat/us-017-us-018-high-risk-card`; run `npm run build` in `frontend/`.
2. Commit with message referencing GitHub issues #61 / #62 (US-017, US-018).
3. Push branch and open PR toward `main`.
4. Reconcile or delete old local branch `feat/improve-charts` if no longer needed.

## Known Issues
- Prior session did not run **git workflow** (fetch, branch from `main`) or **memory-bank updates** at task start — corrected per `.cursorrules` + `.github/copilot-instructions.md`.

## Repo workflow (non-negotiable for agents)
- Read `.github/copilot-instructions.md` and obey **git fetch / branch from up-to-date `main`** for feature work.
- `.cursorrules` points agents to those instructions — treat as mandatory.
