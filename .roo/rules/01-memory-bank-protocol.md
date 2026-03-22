# Memory Bank Protocol v3 — All Roo Code Modes
# Installed to: {project}/.roo/rules/01-memory-bank-protocol.md
# Commit this file. Identical behavior on every machine that clones the repo.

## SESSION START — Mandatory Before Any Task Work

If `memory-bank/` exists at project root:
1. Read `memory-bank/productContext.md` — silently.
2. Read `memory-bank/activeContext.md` — silently.
3. Read `memory-bank/systemPatterns.md` — silently (skip if same as last session).
4. Emit ONE line only: `[Memory Bank: Active — {project}, focus: {activeContext summary ≤10 words}]`
5. Do NOT read other memory-bank files unless the task explicitly requires them.

If `memory-bank/` does NOT exist: skip silently. Do not create it. Do not mention it.

## DURING SESSION — MCP Decision Tree (All Modes)

### Before ANY file read, run this sequence:

**CODE/STRUCTURE questions:**
1. Locate symbol (function/class/method/type)?
   → `serena: find_symbol("{name}")` FIRST.
   → `read_file` only if find_symbol returns nothing.

2. All callers/usages of X?
   → `serena: find_referencing_symbols("{name}")`.

3. Project/module overview?
   → `serena: get_symbols_overview("{directory}")`.
   → NEVER `list_files` recursively as a first action.

4. Text/pattern search across files?
   → `serena: search_for_pattern("{pattern}")`.
   → NEVER loop `read_file` across multiple files.

**EXTERNAL KNOWLEDGE questions:**
5. Have a specific URL (docs page, GitHub issue, release notes, AWS error)?
   → `fetch: fetch("{url}")`. FREE. Returns clean Markdown instantly.
   → Use fetch BEFORE any search engine. Always.

6. Library/framework API behavior?
   → `context7: resolve-library-id` → `get-library-docs`.
   → Only after fetch of a specific page fails or no URL is available.

7. Current web info (CVE, benchmark, comparison)?
   → `brave-search: brave_web_search("{query ≤7 words}")`.
   → MAX 2 searches per session. Never chain more than 2.

8. GitHub issue/PR context?
   → `github` (dynamic tools). Only when ticket number is explicitly referenced.

### Prohibited patterns (these burn money):
- `read_file` on a file "to understand project structure" → use serena
- `list_files` depth>1 as a first action → use serena: get_symbols_overview
- `brave-search` when you have a URL → use fetch instead
- `brave-search` for library API questions → use context7 instead
- Calling `find_symbol` AND `read_file` on the same target in the same step
- Calling any MCP tool twice for the same input in the same session

## ANTI-LOOP — During Session

- Same MCP approach returning no useful result twice? STOP. Report to user.
- Reasoning loops (re-analyzing same evidence): emit "REASONING HALT: [state]. Continuing would loop. User input needed."
- Todo list tool: create and use it for ANY task with more than 3 steps.
- 5 autonomous steps = mandatory checkpoint. No exceptions.

## SESSION END — Update Memory Bank (UMB)

**Trigger:** User types "UMB", "update memory bank", or "save context."

**Steps:**
1. Update `memory-bank/activeContext.md`:
   - What was worked on this session
   - Any blocking issues or open questions
   - Immediate next steps (≤5 bullets)

2. Update `memory-bank/decisionLog.md` IF any of these happened:
   - Architectural decision made
   - Library/approach chosen over alternatives
   - Pattern established for the project

3. Update `memory-bank/progress.md`:
   - Mark completed items ✓
   - Add newly discovered items

4. Update `memory-bank/systemPatterns.md` IF a new coding convention was established.

5. Emit: `[Memory Bank: Updated — {list of files changed}]`

**NEVER:**
- Write to memory-bank/ without UMB trigger or explicit user instruction
- Read the same memory-bank file more than once per session (cache it mentally)
- Put code, API keys, secrets, or credentials into memory-bank/ files
- Create memory-bank/ if it doesn't exist
