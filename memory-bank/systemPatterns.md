# System Patterns

> Coding conventions and patterns established for this project.
> Roo Code must follow these without being asked every session.

## Agent & Git Workflow
- **Mandatory:** Read `.github/copilot-instructions.md` each session (stack, rules, key paths, **git workflow**).
- **Cursor:** `.cursor/rules/fintrack-session-bootstrap.mdc` (`alwaysApply: true`) — same bootstrap; **`.cursorrules`** and root **`AGENTS.md`** point agents at the canonical files.
- **Verify on disk:** `python scripts/agent-instructions.py` (repo root) prints copilot instructions.
- Feature work: `git fetch`; branch **from up-to-date `main`**: `git checkout main && git pull` then `git checkout -b feat/…`.
- Shared business numbers: `shared/project_constants.json` → frontend via `@/lib/constants` (`THRESHOLDS`), not duplicated magic numbers.

## Naming Conventions
- React dashboard widgets under `frontend/src/components/dashboard/`.
- i18n keys under `dashboard.*` / existing namespaces; update all locale JSON files together.

## Frontend — FinTrack dashboard
- Alerts feed and charts use `safeFetch`, TanStack Query, and existing API shapes.
- Risk tiers: align with `XAI_THRESHOLD` (0.70) and `SAR_THRESHOLD` (0.90) from constants.

## Memory Bank
- Session start (if `memory-bank/` exists): read `productContext.md`, `activeContext.md`, `systemPatterns.md` per `.roo/rules/01-memory-bank-protocol.md`.
- Session end or when user requests UMB: update `activeContext.md`, `progress.md`, and `decisionLog.md` / `systemPatterns.md` when decisions or conventions change.

## Testing Conventions
- Run `npm run build` in `frontend/` before considering UI tasks done.

## Other Patterns
- [fill in as established during development]