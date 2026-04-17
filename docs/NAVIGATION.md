# Navigation

Index of where things live. Append a row when you add a significant doc or top-level directory. Keep entries to one line.

| Path | Purpose |
|------|---------|
| `README.md` | Project identity, quickstart, layout. |
| `CLAUDE.md` / `AGENTS.md` | Agent instructions. Byte-identical mirrors. |
| `IDEAS_TRAIL.md` | Agent-maintained narrative of pivots, corrections, open risks. |
| `RESEARCH_LOG.md` | Append-only decision record. **Dormant** unless this is a research project (see CLAUDE.md → File conventions). |
| `DESIGN_PRINCIPLES.md` | Hard UI rules. **Dormant** unless this project has a UI (see CLAUDE.md → File conventions). |
| `src/` | Application code. |
| `tests/` | Tests. Contract-style code goes here. |
| `tests/smoke/` | Smoke scripts for exploratory code (no assertions, exit 0 on success). |
| `scripts/` | Automation and utilities. |
| `scripts/setup.sh` | Finishes scaffolding after a manual `cp -r` of the template. |
| `scripts/sync-agent-docs.sh` | Resyncs CLAUDE.md ↔ AGENTS.md if they drift. |
| `docs/` | Design notes, architecture, external references. |
| `docs/NAVIGATION.md` | This file. |
| `handoffs/` | Session handoff files. See `CLAUDE.md` → Protocols. |
| `consults/` | Call-a-friend consultation files. See `CLAUDE.md` → Protocols. |
| `.githooks/pre-commit` | Rejects commits where CLAUDE.md ≠ AGENTS.md. |
