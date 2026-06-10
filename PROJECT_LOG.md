# Project log — slab-vscode

Single append-only record of decisions, pivots, ideas, findings, risks, and open
threads that future sessions must preserve. This is the project's memory.

It replaces the older split between `IDEAS_TRAIL.md` (the narrative) and
`RESEARCH_LOG.md` (the decision record): one chronological file, newest at the
bottom.

## Current state

Hand-curated orientation block. **Read this first; it saves reading the whole history.** Keep it short -- move resolved items down into the entry trail.

- **Last updated:** 2026-06-10
- **Status:** active
- **Current direction:** Slab is an MVP VS Code extension for markdown/notebook math authoring, scaffold-to-notebook creation, review export, sidebar controls, external MathJax preview, and VSIX release packaging.
- **Open threads:** Marketplace publishing needs the `slab-notebooks` publisher to exist or `package.json.publisher` to be changed, plus a `VSCE_PAT` GitHub secret.
- **Do not repeat:** Do not package local thesis scratch files into the VSIX; `.vscodeignore` excludes them.
- **Next likely step:** Configure the Marketplace publisher/PAT, run `npm run release:check`, then push a `v0.1.0` tag to exercise `.github/workflows/publish.yml` from the public `Daniel90mm/slab` repo.

## When to append

- A project direction is decided, changes, or narrows.
- An architecture, data, or hardware decision is made.
- An idea, hypothesis, or experiment worth exploring later arises.
- A run, test, or analysis produces a finding worth keeping.
- An idea is considered and explicitly rejected — with the reason.
- An earlier assumption or statement is corrected.
- A risk or unresolved question becomes load-bearing.
- A user preference is clarified well enough that future work depends on it.

Do **not** log routine Q&A, tool-use details, or ordinary implementation steps.
Filter: *would a future session be meaningfully worse off without this entry?*
If no, skip it.

## Format

```
## YYYY-MM-DD - Short title

Type: Decision

Brief context in 2-6 sentences. Include the caveat, the rejected
alternative, or the remaining uncertainty when relevant.
```

One entry, one type — pick the dominant one.

| Type | When to use |
|------|-------------|
| **Decision** | A committed direction, architecture choice, or pivot you are acting on. |
| **Pivot** | A prior direction reversed or significantly re-scoped. |
| **Idea** | A hypothesis, mechanic, or experiment worth exploring later. |
| **Finding** | A result from a run, test, or analysis. |
| **Rejected** | An option considered and ruled out, with the reason. |
| **Correction** | An earlier entry or assumption was wrong or incomplete. |
| **Risk** | A load-bearing hazard or unknown to carry forward. |
| **Reference** | An external part, source, or tool the backlog now depends on. |
| **Open thread** | An unresolved question needing follow-up. |
| **Milestone** | A shipped / ordered / verified checkpoint worth dating. |

## Append-only — supersede, never delete

Never edit or delete a past entry, even when it turns out wrong. The trail of
*why* a decision was made and later reversed is the most valuable thing in this
file — deleting it throws away the reasoning a future session needs.

When a later entry overturns an earlier one:

1. Append the new entry normally (`Correction` or `Pivot`) and name the entry it
   replaces.
2. Edit **only the type line** of the old entry to flag it:
   `Type: Decision (SUPERSEDED YYYY-MM-DD - see "<new title>")`

Leave the old body untouched. A reader can then follow the whole chain forward.

## Flowchart (optional)

<!-- When the idea evolution branches enough to be worth seeing at a glance,
keep a mermaid map here and update it on each pivot. Delete this comment if
you never use it.

```mermaid
flowchart TD
    A[Initial idea] --> B[First direction]
    B -.pivot.-> C[Reframed direction]
```
-->

## Entries

<!-- Newest at the bottom. -->

## 2026-06-10 - MVP and Marketplace pipeline

Type: Milestone

Slab now has the first-phase math authoring surface: commands for inline math,
display math, equation, and align insertion; expanded LaTeX completions; sidebar
controls; and smoke coverage for insertion helpers and preview asset rewriting.
The Marketplace path uses local `@vscode/vsce`, `npm run package:vsix`,
`npm run deploy`, GitHub CI packaging, and a tagged/manual publish workflow. The
generated `slab-vscode-0.1.0.vsix` packages cleanly, but actual Marketplace
publishing still depends on external setup for the `slab-notebooks` publisher
and a `VSCE_PAT` repository secret.

## 2026-06-10 - Release check gate

Type: Finding

`npm run release:check` now verifies required Marketplace metadata/files,
GitHub workflows, smoke tests, VSIX packaging, and generated artifact contents.
The check rejects local scratch files such as `thesis.md` and repo-only agent
files if they enter the package. The current generated
`slab-vscode-0.1.0.vsix` contains only Marketplace docs, media, manifest, and
runtime source files.

## 2026-06-10 - Release tag invariant

Type: Decision

Tagged Marketplace releases must use a Git tag matching `package.json.version`
exactly, e.g. `v0.1.0` for version `0.1.0`. `scripts/release-check.mjs` enforces
this when `GITHUB_REF_TYPE=tag`, so an accidental mismatched tag fails before
packaging or publishing. This keeps iterative Marketplace updates aligned with
the version shown in the VSIX manifest.

## 2026-06-10 - Native Markdown boundary

Type: Decision

Slab should align with VS Code's native Markdown preview and notebook Markdown
renderer instead of replacing them. Native VS Code already renders KaTeX math,
Mermaid diagrams, and common Markdown preview workflows, so Slab should focus on
authoring helpers, `.md <-> .ipynb` workflow, review export, sidebar controls,
and second-screen preview where that workflow is genuinely distinct. Future
overlap with native VS Code behavior should default to deferral, narrowing, or
deletion unless a concrete gap is documented.
