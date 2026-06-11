# Slab re-scope: lightweight markdown companion for Culmen

- **Date:** 2026-06-11
- **Status:** Approved
- **Supersedes:** the notebook-centric direction ("Slab for Notebooks", scaffold → `.ipynb` → review export)

## Context

Culmen (`../Culmen`, Electron app) is markdown-native end to end:

1. Its `generate_note_scaffold` LLM task writes a scaffold (H1 title + overview + H2
   sections) into the concept's linked note file `<docsRoot>/<Concept>/<Concept>.md`.
2. It opens that file in the system editor (VS Code) via `shell.openPath`.
3. Its "Review Notes" feature reads the **same linked `.md` file** from disk and grades
   it with an LLM against the scaffold sections, key concepts, and misconceptions.
4. Its asset tracker only understands plain `![alt](assets/...)` markdown image syntax
   (`main/services/study-material-files.js`) — HTML `<img>` tags are invisible to it.
   Concept workspace layout: `<Concept>/<Concept>.md` + `assets/` + `feedback/`.

Slab's notebook pipeline (`parse-scaffold.js` was written against "Culmen's scaffold
markdown contract") inserted an `.ipynb` detour into this loop: md → ipynb → md. The
detour created two sources of truth (the notebook being edited vs. the `.md` Culmen
grades), required an attachment extractor to repair base64 image embedding, and left a
gap — Slab exported `<name>-review.md` as a sibling while Culmen reads the originally
linked file.

Culmen also has **no markdown renderer** (its only dependency is the Anthropic SDK), so
Slab's external popout preview is the only rendered view of notes in the entire
workflow.

## Decision

Slab becomes a **markdown-only** companion for authoring Culmen study notes. The
notebook pipeline is deleted. The note file Culmen links is the file the user edits is
the file that gets reviewed — the loop closes with zero machinery.

Slab owns exactly four things:

1. External popout preview (themed)
2. Theme presets (one switch drives editor token colors + popout styling)
3. Authoring completions (LaTeX + asset paths)
4. Table editing helpers

Everything else defers to VS Code native (preview rendering, KaTeX, image paste,
notebooks). Hard constraints: lightweight, no clash with native features, respect
Culmen's file contract (`<Concept>/<Concept>.md`, plain `![](assets/...)`, single
source of truth).

## Design

### 1. Identity & manifest

- `displayName` drops "for Notebooks"; description becomes a lightweight markdown
  companion for Culmen-style notes. Notebook keywords/categories removed.
- Remove setting `slab.preferNotebookMarkdown`. Keep `slab.showStatusBarEntry`,
  `slab.activeTheme`, `slab.latexColors.*`.
- Version → 0.2.0. The extension was never published to the Marketplace, so command IDs
  may be renamed: `slab.notebookPreviewMode` → `slab.openPreview`.
- Activation events and contributed commands shrink to the surviving feature set.

### 2. Deletions (prune in place)

- `src/adapter/` (parse-scaffold, emit-notebook, flatten-notebook)
- `src/commands/` (createNotebookFromScaffold, exportNotebookForReview,
  extractAttachments)
- `src/attachments/`
- Notebook branches in `src/extension.js`: notebook preview target, attachment
  data-URI handling, notebook surface/status-bar states
- Sidebar notebook action buttons (scaffold → notebook, export review)
- Smoke tests: extract-attachments, flatten-notebook, scaffold-to-notebook,
  command-roundtrip

Surviving smoke tests: activate, block-math-delimiters, math-insertion, preview-assets.

### 3. Popout preview (kept, simplified, themed)

- The local-HTTP + external-browser preview (`src/preview/registerExternalPreview.js`)
  stays and becomes markdown-only.
- The active theme preset injects its palette as CSS variables into the served page so
  editor and popout always match.
- Existing asset-path rewriting already serves images relative to the note's folder;
  `assets/` works unchanged.

### 4. Themes (editor + popout, one switch)

- Each preset in `src/sidebar/slabThemes.js` gains a popout palette (background, text,
  accent, code blocks, tables) alongside its existing LaTeX token colors.
- Applying a preset from the sidebar updates both at once.
- All popout/sidebar styling obeys `DESIGN_PRINCIPLES.md`: flat, near-sharp corners,
  real contrast, no pill shapes.

### 5. Tables (new: editing helpers only)

- New `src/editor/registerTableHelpers.js`:
  - Re-align/format the pipe table under the cursor
  - Tab / Shift+Tab to move between cells inside a table
  - Insert/delete row and column commands
- The formatter core is a pure function: smoke-testable, and it never modifies text
  outside a detected pipe-table block.
- Tab keybindings are scoped narrowly
  (`editorTextFocus && editorLangId == markdown && slab.inTable &&
  !suggestWidgetVisible && !inSnippetMode`) so they never clash with native
  suggestions, snippets, or indentation.
- Table rendering stays native (VS Code preview renders GFM tables fine; the editing
  gap is what Slab fills).

### 6. Images (steer native paste, do not replace it)

- VS Code natively saves pasted/dropped images and inserts `![](...)`. Slab only
  steers the destination by setting native `markdown.copyFiles.destination` so pasted
  images land in `assets/` next to the note — matching Culmen's layout.
- Setup is an explicit sidebar action ("Use Culmen asset layout") writing the
  user-level setting; never silently overwrite an existing user value.
- No custom paste provider — that would clash with native behavior.
- Resizing must never switch links to HTML `<img>` tags: Culmen's scanner only reads
  `![](assets/...)`.

### 7. Completions

- Existing LaTeX snippet/command completions (`src/editor/registerLatexSupport.js`)
  stay, including math insert commands and token highlighting.
- New sibling provider: inside `![](`, complete image paths from the `assets/` folder
  next to the current document, inserting Culmen-safe relative paths
  (`assets/<file>`). Silently no-ops when no assets folder exists.

### 8. Error handling

- Preview server errors surface via `showErrorMessage` (existing behavior).
- Table commands no-op with a quiet status message when the cursor is not inside a
  detected table; the formatter refuses rather than guesses on malformed blocks.
- Asset completion returns no items on missing/unreadable `assets/`.
- The paste-destination setup only ever writes the single
  `markdown.copyFiles.destination` key and asks before changing an existing value.

### 9. Testing & bookkeeping

- `npm run smoke`: drop the four notebook tests; add table-formatter tests (alignment,
  cell navigation positions, row/column ops, non-table text untouched) and
  asset-completion tests (path listing, no-assets no-op) over the pure cores.
- `PROJECT_LOG.md`: Pivot entry (md-only; notebook pipeline deleted; Culmen trace
  rationale) and update of the `## Current state` block.
- README and AGENTS.md project capsule rewritten to the new identity.

## Rejected alternatives

- **Keep the notebook pipeline (+ close the export loop):** rejected — the `.ipynb`
  detour creates dual sources of truth and exists only to serve runnable code, which
  VS Code's native Jupyter support covers outside the review loop.
- **Resize images via HTML `<img width>`:** rejected — invisible to Culmen's asset
  scanner.
- **Custom paste/drop provider for images:** rejected — clashes with VS Code native
  paste; steering the native setting suffices.
- **Fresh rewrite / split into two extensions:** rejected — prune in place keeps
  working preview/sidebar/completion code, git history, and release plumbing.

## Deferred (recorded, not built)

- File-based image resize command (downscale the actual file, keep `![](...)` intact)
- Popout image niceties (max-width fit, click-to-zoom)
- Unused-asset cleanup command
- Culmen scaffold-section snippets in completions
