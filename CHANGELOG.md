# Changelog

## 0.2.0 — 2026-06-12

Re-scoped Slab to a markdown-only companion for Culmen study notes.

- Removed: the notebook pipeline (scaffold → `.ipynb`, review export, attachment extraction) and the `slab.preferNotebookMarkdown` setting.
- Renamed: `slab.notebookPreviewMode` → `slab.openPreview`.
- Added: theme presets now style the external popout preview as well as editor LaTeX colors.
- Added: pipe-table editing — Tab/Shift+Tab cell navigation with auto-alignment, format/insert/delete row and column commands.
- Added: image path completion from the note's `assets/` folder.
- Added: `Slab: Use Culmen Asset Layout` points `markdown.copyFiles.destination` at `assets/`.

## 0.1.0 - 2026-06-10

- Added Slab math insertion commands for inline math, display math, equation environments, and align environments.
- Expanded LaTeX completions for common environments, Greek letters, operators, and formatting commands.
- Added focused smoke coverage for math insertion helpers and preview asset rewriting.
- Added Marketplace packaging scripts, local `vsce` tooling, CI packaging, and tagged-release publishing workflow.

## 0.0.1 - 2026-04-17

- Initial Slab notebook and markdown helper prototype.
- Added markdown scaffold to `.ipynb` creation, review markdown export, attachment extraction, LaTeX highlighting, sidebar controls, and external preview.
