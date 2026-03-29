# Decision Log

> Architectural and implementation decisions. Date-stamped.
> Prevents Roo from re-litigating already-made choices.

## Format
Each entry: `[YYYY-MM-DD] DECISION: ... | RATIONALE: ... | ALTERNATIVES REJECTED: ...`

---

## Log

<!-- Example:
[2026-03-21] DECISION: Use repository pattern for all DB access
  RATIONALE: Decouples business logic from ORM, easier to mock in tests
  ALTERNATIVES REJECTED: Active Record (too coupled), raw SQL (too verbose)
-->

[2026-03-28] DECISION: High Risk card (`LiveAlertFeed`) uses client-side filter on `/api/alerts?status=PENDING_REVIEW` results: keep only `anomaly_score >= XAI_THRESHOLD` and exclude statuses NORMAL / RESOLVED / FALSE_POSITIVE; sort by score DESC then timestamp DESC; tier chips filter Critical (≥ SAR) vs Suspicious [XAI, SAR). | RATIONALE: Matches US-017/US-018 without new API. | ALTERNATIVES REJECTED: New backend endpoint (out of scope).

[2026-03-28] DECISION: Suspicious-tier badge/chip styling uses CSS variables `--high-risk-suspicious` and `--high-risk-suspicious-foreground` scoped on the Card (Tailwind arbitrary properties + `dark:` overrides), not global `index.css`. | RATIONALE: Theme-correct orange tier without editing global tokens; destructive tier uses existing `Badge` destructive → `hsl(var(--destructive))`. | ALTERNATIVES REJECTED: Badge `warning` variant (hardcoded amber), global new CSS vars.

