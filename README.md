# slab-vscode

Slab-inspired notebook and markdown helpers for VS Code, aimed at making Jupyter-based exercise writing calmer and less painful than a custom editor stack.

## Features

- Create `.ipynb` notebooks from markdown scaffolds
- Export notebooks back to review-friendly markdown
- Auto-extract pasted notebook attachments during review export
- Add LaTeX-aware completions and math highlighting to markdown surfaces
- Insert inline math, display math, equation environments, and align environments from commands or the sidebar
- Open a live compiled markdown/LaTeX preview in your external browser
- Use the Slab sidebar as a control surface for themes and core commands

## Commands

- `Slab: Create Notebook From Scaffold`
- `Slab: Export Notebook For Review`
- `Slab: Open Preview`
- `Slab: Insert Inline Math`
- `Slab: Insert Display Math`
- `Slab: Insert Equation Environment`
- `Slab: Insert Align Environment`

## Development

```bash
npm run smoke
npm run package:vsix
npm run release:check
```

The runtime stays intentionally simple: the extension manifest lives in `package.json`, the runtime entrypoint is `src/extension.js`, the adapter/command pipeline owns `.md <-> .ipynb`, and the smoke suite exercises both detection and roundtrip behavior without needing a full VS Code host session.

To try the extension inside VS Code:

1. Open this folder in VS Code.
2. Press `F5`.
3. Choose the `Run Extension` launch configuration if prompted.
4. In the Extension Development Host window, open an `.ipynb` file.
5. Run `Slab: Open Preview` from the command palette.
6. Your default browser opens the live preview. Move that browser window to another screen if you want a second-screen layout.

## Notes

- Feedback files stay markdown-first. The extension is built around notebook authoring plus markdown review/export.
- The sidebar is a control surface, not a renderer.
- The external preview is live-updating and also includes a manual refresh button.
- Marketplace publishing uses `@vscode/vsce` and the `VSCE_PAT` GitHub Actions secret.

## Layout

- `package.json` — VS Code extension manifest, command contributions, scripts
- `src/` — application code
- `tests/` — tests
- `scripts/` — automation and utilities
- `docs/` — design notes, references, architecture
- `PROJECT_LOG.md` — append-only project memory: decisions, pivots, findings, risks
- `comms/` — messages written for another model: session handoffs + consults (see `CLAUDE.md` → Protocols)

## Agent instructions

See `CLAUDE.md` / `AGENTS.md` (mirrored).
