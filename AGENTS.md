# Agent instructions — slab-vscode

> `CLAUDE.md` is a symlink to this file. **Edit `AGENTS.md`.** Shared rules: [`../.agent/CONVENTIONS.md`](../.agent/CONVENTIONS.md).

## Project capsule

- **Identity:** VS Code extension: Slab-inspired notebook + markdown helpers -- create `.ipynb` from markdown scaffolds, export back to review-friendly markdown, LaTeX-aware completions/math highlighting, and a live external-browser preview. Aimed at calmer Jupyter-based exercise writing.
- **Status:** active
- **Current goal:** <!-- the one thing in flight -->
- **Hard constraints:** Has a UI (sidebar control surface) -- engage DESIGN_PRINCIPLES.md for UI changes. Keep the runtime simple; sidebar is a control surface, not a renderer.
- **Primary commands:** `npm run smoke` (detection + .md<->.ipynb roundtrip); F5 launches the Extension Development Host.
- **Key files:** `package.json` (manifest), `src/extension.js` (entrypoint), `src/preview/`, `src/sidebar/`, `src/editor/`.

## Shared rules

- **Core conventions (read once):** `../.agent/CONVENTIONS.md`
- **Project memory:** `PROJECT_LOG.md` — read its `## Current state` block first; append per its header (supersede, never delete).
- **Messages to other models:** `comms/` — see `comms/README.md`.

## Minimal always-on rules

Full set in `../.agent/CONVENTIONS.md`; inlined so a standalone clone still has the essentials.

- **Read before edit** — re-read a file before editing once the context has grown.
- **Plan first** — for non-trivial work, output the plan and wait for "yes" / "do it".
- **No invention** — never invent URLs, versions, APIs, or citations. Verify or omit.
- **Ask, don't loop** — after two failed attempts, stop and say where your model is wrong.

## Project-specific rules

<!-- Rules unique to THIS project only. Generic rules live in ../.agent/CONVENTIONS.md. -->

- **Push after big milestones** — after each substantial verified milestone, commit and push the work unless the user explicitly asks not to, the remote/credentials are unavailable, or the worktree contains unrelated changes that need user confirmation first. State clearly when pushing is skipped and why.

## Learned conventions

<!-- Append-only. `YYYY-MM-DD: <fact>`. -->
- 2026-06-10: Push after each big verified milestone when a remote and credentials are available; otherwise report the blocker explicitly.
