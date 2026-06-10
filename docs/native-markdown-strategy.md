# Native Markdown Strategy

Slab should compose with VS Code's built-in Markdown and notebook Markdown
rendering, not replace it.

## What VS Code already owns

VS Code's native Markdown preview already provides:

- Markdown preview rendering for `.md` files
- KaTeX rendering for inline `$...$` and block `$$...$$` math
- Mermaid diagram rendering
- scroll synchronization and preview/editor association settings
- Markdown preview style/script extension points

VS Code notebook Markdown cells also support `$...$` and `$$...$$` math using
KaTeX.

References:

- https://code.visualstudio.com/docs/languages/markdown
- https://code.visualstudio.com/updates/v1_56
- https://code.visualstudio.com/updates/v1_58

## What Slab should own

Slab should focus on authoring and review workflow gaps:

- markdown scaffold to `.ipynb`
- `.ipynb` to review-friendly markdown export
- attachment extraction during export
- LaTeX insertion commands and editor-side highlighting/completions
- sidebar controls for workflow commands and visual token presets
- external browser preview for a second-screen authoring workflow

## Deferral rule

If VS Code's native Markdown preview or notebook Markdown renderer already
handles a rendering feature well, Slab should defer to VS Code instead of
shipping a competing renderer. If VS Code adds overlapping functionality later,
prefer deleting or narrowing Slab code over keeping duplicate behavior.

Any future preview work must answer this first: why is the native Markdown
preview insufficient for this workflow?
