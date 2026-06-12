# Agent instructions — slab-vscode

> `CLAUDE.md` is a symlink to this file. **Edit `AGENTS.md`.** Shared rules: [`../.agent/CONVENTIONS.md`](../.agent/CONVENTIONS.md).

## Project capsule

- **Identity:** VS Code extension: lightweight markdown companion for Culmen study notes -- themed external browser preview, LaTeX-aware completions/highlighting, pipe-table editing helpers, asset-path completion, and Culmen-friendly image paste defaults. Defers standard rendering to VS Code native.
- **Status:** active
- **Current goal:** <!-- the one thing in flight -->
- **Hard constraints:** Has a UI (sidebar control surface) -- engage DESIGN_PRINCIPLES.md for UI changes. Keep the runtime simple; sidebar is a control surface, not a renderer.
- **Primary commands:** `npm run smoke` (8 smoke scripts); F5 launches the Extension Development Host.
- **Key files:** `package.json` (manifest), `src/extension.js` (entrypoint), `src/preview/`, `src/sidebar/`, `src/editor/`, `src/commands/`.

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
- **Defer to native Markdown** — VS Code's built-in Markdown preview owns standard rendering features such as KaTeX math, Mermaid, scroll sync, and preview customization. Slab should add workflow and authoring helpers, not a competing renderer, unless a concrete workflow gap is documented first.

## Learned conventions

<!-- Append-only. `YYYY-MM-DD: <fact>`. -->
- 2026-06-10: Push after each big verified milestone when a remote and credentials are available; otherwise report the blocker explicitly.
- 2026-06-10: Keep Slab aligned with VS Code native Markdown rendering; defer or delete overlapping renderer features when native behavior is sufficient.
