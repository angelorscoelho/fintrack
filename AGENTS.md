# FinTrack — agent bootstrap

All automated assistants (Cursor, Copilot, CI review bots) must **read and follow** the same instruction set.

## Required reading (before coding or planning)

| Order | File | Purpose |
| ----- | ---- | ------- |
| 1 | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Stack, rules, git workflow, key paths |
| 2 | [`.roo/rules/01-memory-bank-protocol.md`](.roo/rules/01-memory-bank-protocol.md) | Memory-bank read/UMB rules |
| 3 | [`memory-bank/productContext.md`](memory-bank/productContext.md) | Product summary (if `memory-bank/` exists) |
| 4 | [`memory-bank/activeContext.md`](memory-bank/activeContext.md) | Current focus |
| 5 | [`memory-bank/systemPatterns.md`](memory-bank/systemPatterns.md) | Conventions |

## Cursor

Project rules live in **`.cursor/rules/`** (e.g. `fintrack-session-bootstrap.mdc` with `alwaysApply: true`).  
Root **`.cursorrules`** duplicates the pointer so legacy setups still apply.

## Terminal

```bash
python scripts/agent-instructions.py
```

(or `make agent-instructions` if GNU Make is installed)

Prints `.github/copilot-instructions.md` so humans/agents can verify the file on disk.
