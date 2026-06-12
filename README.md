# Slab

Lightweight markdown companion for Culmen study notes — and for anyone writing math-heavy markdown in VS Code.

Slab adds a themed external preview and small authoring helpers around VS Code's native markdown support. It deliberately does **not** replace anything VS Code already does well (preview rendering, KaTeX math in the built-in preview, image paste).

## Features

- **External popout preview** — `Slab: Open Preview` renders the active markdown file with MathJax in your browser, on a second screen if you like. It live-updates as you type and follows the active Slab theme.
- **Themes** — one preset recolors both the LaTeX highlighting in the editor and the popout preview. Switch from the Slab sidebar.
- **LaTeX authoring** — completions for environments, commands, Greek letters, and symbols; math token highlighting; insert commands for inline/display math, equation, and align.
- **Table editing** — Tab/Shift+Tab move between cells and keep the pipe table aligned; commands to format and to insert/delete rows and columns. Rendering stays native.
- **Asset paths** — image link completion from the `assets/` folder next to your note, and a one-click setting so pasted images land in `assets/` (Culmen's workspace layout).

## Commands

| Command | What it does |
| --- | --- |
| `Slab: Open Preview` | Open the themed external browser preview |
| `Slab: Format Table` | Re-align the pipe table under the cursor |
| `Slab: Table Next/Previous Cell` | Move between table cells (bound to Tab/Shift+Tab inside tables) |
| `Slab: Table Insert Row Below / Delete Row` | Row operations |
| `Slab: Table Insert Column Right / Delete Column` | Column operations |
| `Slab: Insert Inline/Display Math, Equation, Align` | Math snippets |
| `Slab: Use Culmen Asset Layout` | Point `markdown.copyFiles.destination` at `assets/` |

## Settings

- `slab.activeTheme` — current theme preset
- `slab.showStatusBarEntry` — toggle the status bar entry
- `slab.latexColors.*` — individual LaTeX token colors (written by theme presets)

## Development

- `npm run smoke` — run all smoke tests
- F5 in VS Code — launch the Extension Development Host
- `npm run release:check` — full release gate (tests, packaging, VSIX contents)
