# Navigation

Index of where things live. Append a row when you add a significant doc or top-level directory. Keep entries to one line.

| Path | Purpose |
|------|---------|
| `package.json` | VS Code extension manifest, activation events, command contributions, smoke scripts. |
| `.vscode/launch.json` | VS Code debug config for launching an Extension Development Host with `F5`. |
| `README.md` | Project identity, quickstart, layout. |
| `CHANGELOG.md` | Marketplace-facing release notes. |
| `LICENSE` | Current source and package license terms. |
| `SUPPORT.md` | Marketplace-facing support instructions. |
| `CLAUDE.md` / `AGENTS.md` | Agent instructions. Byte-identical mirrors. |
| `PROJECT_LOG.md` | Append-only project memory: dated, typed entries (decisions, pivots, findings, risks, open threads). Supersede, never delete. |
| `DESIGN_PRINCIPLES.md` | Hard UI rules. **Dormant** unless this project has a UI (see CLAUDE.md → File conventions). |
| `src/` | Application code. |
| `src/extension.js` | Extension activation, command wiring, preview-source selection, status bar behavior. |
| `src/preview/` | External browser preview server and live preview plumbing. |
| `src/sidebar/` | Slab sidebar control surface and theme preset UI. |
| `src/editor/` | LaTeX completions and math decoration logic for markdown surfaces. |
| `.github/workflows/ci.yml` | GitHub Actions smoke-test and VSIX packaging workflow. |
| `.github/workflows/publish.yml` | GitHub Actions tagged/manual Marketplace publishing workflow using `VSCE_PAT`. |
| `.vscodeignore` | Excludes tests, comms, and agent-only files from packaged `.vsix` artifacts. |
| `tests/` | Tests. Contract-style code goes here. |
| `tests/smoke/` | Smoke scripts for exploratory code (no assertions, exit 0 on success). |
| `tests/smoke/activate.mjs` | Smoke check for notebook markdown detection and placeholder messaging. |
| `scripts/` | Automation and utilities. |
| `scripts/setup.sh` | Finishes scaffolding after a manual `cp -r` of the template. |
| `scripts/release-check.mjs` | Runs tests, packages the VSIX, and verifies Marketplace artifact contents. |
| `docs/` | Design notes, architecture, external references. |
| `docs/NAVIGATION.md` | This file. |
| `docs/publishing.md` | Marketplace setup, local packaging checks, and publish/update flow. |
| `comms/` | Messages written for another model: `HANDOFF_*` (next session) + `CONSULT_*` (external model). See `CLAUDE.md` → Protocols. |
| `comms/HANDOFF_2026-04-17_1446.md` | Amended handoff locking raw-file attachment extraction, `.md` feedback, and JS-only Phase 2 decisions. |
| `comms/HANDOFF_2026-04-17_1605.md` | Sidebar-control pass and command-level `.md <-> .ipynb` roundtrip regression notes. |
| `.githooks/pre-commit` | Rejects commits where CLAUDE.md ≠ AGENTS.md. |
