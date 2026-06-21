# Agent instructions — slab-vscode

<!-- BEGIN MANAGED: agent-delegation -->
## Agent Delegation

This repository may use DeepSeek only through `agent-delegate`.

Before delegating, write a task file with YAML front matter declaring `provider`, `topic`, `allowed_read`, `allowed_write`, and `output`. Run `agent-delegate deepseek --dry-run <task-file>` before the first real call.

Use DeepSeek only for bounded, reviewable work. Do not call DeepSeek directly, and do not send secrets, credentials, private logs, compliance-sensitive material, or files outside the declared allowlist.

DeepSeek output is advisory. The active Codex/Claude agent owns final review, tests, edits, and commits.

If you are a Codex agent and Daniel explicitly asks for parallel agents, subagents, or delegation, prefer native Codex subagents for repo-private parallel work. Keep each subagent task bounded, give it a disjoint read/write scope, and merge results only after reviewing them in the parent thread.

For non-interactive Codex delegation, use `codex exec` only with an explicit `--cd`, sandbox, and approval policy. Prefer separate git worktrees for concurrent write tasks.

## Cross-project context (atlas)

To discover what other projects exist and what reusable data/assets they hold, run `atlas find <topic>` or `atlas context <project>` (on PATH, from `computer-use/agent-delegation`). It harvests every project's capsule on demand, so names alone are not enough — `find` searches the substance (identities, assets, current state, edges). Hand work to the owning project via `baton`; do not re-read other repos.

When you discover a real cross-project link or a reusable asset, record it in this project's `AGENTS.md` capsule (the `Assets:` line and the `## Related projects` section) so the next agent inherits it — that is how workspace interconnectedness compounds.

`atlas` respects trust and walls: a `forbidden` project is never surfaced and a `private` one is labelled. Never pack `private`/walled context into a handoff a shareable or worker model would see.
<!-- END MANAGED: agent-delegation -->


> `CLAUDE.md` is a symlink to this file. **Edit `AGENTS.md`.** Shared rules: [`../.agent/CONVENTIONS.md`](../.agent/CONVENTIONS.md).

## Project capsule

- **Identity:** VS Code markdown companion (themed external preview, MathJax) for Culmen study notes and math-heavy markdown.
- **Status:** active
- **Current goal:** <!-- the one thing in flight -->
- **Hard constraints:** Has a UI (sidebar control surface) -- engage DESIGN_PRINCIPLES.md for UI changes. Keep the runtime simple; sidebar is a control surface, not a renderer.
- **Primary commands:** `npm run smoke` (8 smoke scripts); F5 launches the Extension Development Host.
- **Key files:** `package.json` (manifest), `src/extension.js` (entrypoint), `src/preview/`, `src/sidebar/`, `src/editor/`, `src/commands/`.
- **Assets:** <!-- reusable data/files another project might want: path — what it is. Surfaced by `atlas`. -->

## Related projects

- Culmen — renders Culmen study notes
- Slab — sibling markdown tooling

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
