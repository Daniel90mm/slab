> **Mirror of AGENTS.md — edit either, they must stay byte-identical.** The pre-commit hook will reject divergence. Run `scripts/sync-agent-docs.sh` if they drift.

# Agent instructions — slab-vscode



<!-- BEGIN MANAGED: agent-delegation -->
## DeepSeek Delegation

This repository may use DeepSeek only through `agent-delegate`.

Before delegating, write a task file with YAML front matter declaring `provider`, `topic`, `allowed_read`, `allowed_write`, and `output`. Run `agent-delegate deepseek --dry-run <task-file>` before the first real call.

Use DeepSeek only for bounded, reviewable work. Do not call DeepSeek directly, and do not send secrets, credentials, private logs, compliance-sensitive material, or files outside the declared allowlist.

DeepSeek output is advisory. The active Codex/Claude agent owns final review, tests, edits, and commits.
<!-- END MANAGED: agent-delegation -->




## Identity

<!-- One or two sentences: what this project is, who it's for, what makes it different. Fill in when the project has one. -->

## Hard rules

### Read before edit
After ~10 messages, re-read any file before editing it. Auto-compaction destroys your memory of the exact contents, and the Edit tool fails silently on stale `old_string` matches. When in doubt, Read.

### Dead code first, refactor second
Before any structural refactor of a file >300 LOC, remove dead props, unused exports/imports, and debug logs in a separate commit. Do not stack new complexity on top of old garbage.

### Phased refactors
Never touch more than 5 files in one response during a refactor. Finish a phase, verify (tests / typecheck / manual), get approval, continue.

### Navigate by package boundary
In unfamiliar areas of this repo, start from `README.md` → `docs/` → top-level directory purposes. Treat the directory layout as the API. Do not grep blindly from root.

### No invention
Do not invent URLs, version numbers, API endpoints, or citations. Verify or omit.

### Plan first for non-trivial work
For anything beyond a localized edit, output the plan and wait for explicit approval ("yes", "do it") before writing code.

### Testing
For code with a clear input→output contract (parsers, pure functions, API handlers), write a test in `tests/` alongside the change. For exploratory or research code, write a smoke script in `tests/smoke/` — a minimal script that imports the module, runs the core function, and exits 0 on success. No assertions required. If neither fits, log the open risk in `IDEAS_TRAIL.md`. Do not skip this silently.

### Keep `docs/NAVIGATION.md` current
When you add a significant doc or top-level directory, append a row to `docs/NAVIGATION.md`. One line per entry. This is the index a future agent hits before anything else.

### Work from real errors
If a bug report has no output, ask the user to run a command and paste the result. Do not guess at error states.

### Ask, don't loop
If a fix does not work after two attempts, stop. State where your mental model is wrong and ask for clarification. Do not keep trying variations.

## File conventions

### All-caps = agent-maintained
Meta-files at the repo root use `UPPER_SNAKE_CASE.md` (CLAUDE.md, AGENTS.md, IDEAS_TRAIL.md, RESEARCH_LOG.md, DESIGN_PRINCIPLES.md, NAVIGATION.md). These are agent-maintained.

Human-written reference docs in `docs/` use lowercase (`api.md`, `auth-flow.md`, `architecture.md`). The case is the signal — do not capitalize human docs, do not lowercase agent docs.

Exception: `README.md` is the universal convention and is always caps regardless.

### Conditional files (ship-but-dormant)

Two root files ship with every project but stay dormant until summoned. Do **not** engage their conventions on ordinary work:

- **`DESIGN_PRINCIPLES.md`** — read and obey only when this project has a UI / visual output and you are about to make UI decisions. For backend / CLI / data work, ignore.
- **`RESEARCH_LOG.md`** — engage its ceremony (agent-letter identity A/B/C, per-session reasoning effort) only if **(a)** the user has framed this as a research project, or **(b)** the file already has at least one appendix. Otherwise leave it alone. Do **not** ask "which agent letter am I?" on ordinary edits.

If unsure whether to engage, ask once.

## Protocols

### Session handoff — `handoffs/SESSION_<YYYY-MM-DD_HHMM>.md`

Write one when any of these triggers fire:

- **Coherence degrading** — you are asking the same question twice, misremembering file contents you just read, or contradicting yourself.
- **User frustration** — the user is visibly annoyed, the session has lost its thread, or the user says "start over".
- **Natural phase boundary** — a clean checkpoint (investigation → implementation, backend → frontend, spec → code).

Do **not** trigger on conversation length or proximity to compaction. Auto-compaction is routine and is not a signal.

Contents:

- **Just completed** — what actually got done, not what was attempted.
- **Next exact step** — the single next action.
- **Files touched** — paths, so the next agent re-reads them fresh.
- **Open threads** — deferred decisions and assumptions still in-head.
- **Do not** — things already tried that failed, so the next session does not loop.

### Consult — `consults/CONSULT_<topic>.md`

When you are stuck, **ask the user first**: *"I'm stuck on X. Want me to write a consult?"* Only proceed on explicit agreement.

Structure:

```
## For the consultant

[Register, depth, format. This is LLM-to-LLM — human readability is
not required. Example: "Answer in raw causal chains. No preamble.
No hedging. If you need more data, list exact grep commands."]

## Problem

[What the project is in 3–5 sentences. What has been tried, with
file:line references and why each attempt failed. Numbered specific
questions — answerable, not "what should I do". Inlined relevant
code (the consultant has no repo access). Hard constraints.]
```

The user pastes section-by-section into another model and saves the reply as `consults/CONSULT_<topic>_REPLY.md`. The requesting agent reads the reply and continues.

The act of writing the Problem section resolves a large fraction of consults before they are sent. This is intentional.

### Scratch → standard upgrade

If this project is **scratch-tier** (only README.md and .gitignore at root, no CLAUDE.md/AGENTS.md), watch for signals that it is outgrowing scratch:

- The user asks for tests, src/ structure, or formal docs.
- More than one source file is being written.
- The first non-README commit is being prepared.
- The user starts treating it as a real project ("let's add X feature", "what's the architecture").

When you see one, **ask once**: *"This looks like it's outgrowing scratch. Run `new-project --upgrade` to add the standard scaffolding?"* Only proceed on explicit yes. The upgrade is no-clobber — your existing README and source files are safe.

## Mirror enforcement

CLAUDE.md and AGENTS.md must be byte-identical. When you edit one, immediately overwrite the other (`cp CLAUDE.md AGENTS.md` or the reverse). The pre-commit hook will reject commits where they differ.

## Learned conventions

<!--
Append-only. Add an entry when you discover a structural fact worth persisting across sessions.

Filter: would a future session be meaningfully worse off without this entry? If no, skip it.

Keep entries to one or two lines. Prefix with date: `YYYY-MM-DD: <fact>`.
-->
