# Markdown Companion Re-scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-scope Slab from a notebook pipeline extension to a lightweight markdown-only companion for Culmen: themed popout preview, unified editor+popout themes, table editing helpers, asset-path completion, and Culmen-friendly image paste defaults.

**Architecture:** Prune in place — delete `src/adapter/`, `src/commands/`, `src/attachments/` and their tests, simplify `src/extension.js` to markdown-only, then add three small feature modules (`tableModel.js` pure core + wiring, `assetPaths.js` pure core + wiring, `useCulmenAssetLayout.js` command). Pure logic lives in dependency-free modules tested by the existing smoke-script pattern (`tests/smoke/*.mjs` scripts that throw on failure).

**Tech Stack:** Plain CommonJS VS Code extension (no bundler, no test framework — smoke scripts via `npm run smoke`), marked + MathJax CDN in the popout page.

**Spec:** `docs/superpowers/specs/2026-06-11-markdown-companion-rescope-design.md`

**Conventions for this repo:**
- Tests are plain `.mjs` scripts in `tests/smoke/` that `throw new Error(...)` on failure and `console.log("Smoke passed for ...")` on success. They load CommonJS modules via `createRequire`. Follow this pattern exactly; do not introduce a test framework.
- Run all tests with `npm run smoke` from the repo root.
- Commit after every task. Per project rules, push after the final verification task.

---

## Task 1: Make the extension core markdown-only

Remove all notebook awareness from the entrypoint, sidebar, and LaTeX selector. Rename the preview command to `slab.openPreview`. The notebook pipeline modules still exist on disk after this task (deleted in Task 2) — nothing imports them from `extension.js` anymore, and their own smoke tests still pass.

**Files:**
- Modify: `src/extension.js` (full rewrite, content below)
- Modify: `src/sidebar/registerSlabSidebar.js`
- Modify: `src/editor/registerLatexSupport.js:1-5`
- Modify: `package.json` (commands + activationEvents)
- Test: `tests/smoke/activate.mjs` (full rewrite, content below)

- [ ] **Step 1: Rewrite the activate smoke test for markdown-only expectations**

Replace the entire content of `tests/smoke/activate.mjs` with:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const extension = require("../../src/extension.js");

if (extension.COMMAND_ID !== "slab.openPreview") {
  throw new Error(`Expected the preview command id to be slab.openPreview, got ${extension.COMMAND_ID}.`);
}

const markdownSurface = extension.resolveSlabSurface({
  languageId: "markdown",
  uriScheme: "file",
});

if (!markdownSurface.isMarkdown || !markdownSurface.canEnablePreviewMode) {
  throw new Error("Expected a markdown file to enable preview mode.");
}

if (extension.buildStatusBarText(markdownSurface) !== "Slab: Markdown") {
  throw new Error("Expected markdown documents to use the markdown status bar label.");
}

const markdownMessage = extension.buildMessage(markdownSurface);
if (!markdownMessage.includes("external browser window")) {
  throw new Error("Expected markdown messaging to describe the external preview.");
}

if (markdownMessage.toLowerCase().includes("notebook")) {
  throw new Error("Expected markdown messaging to stop mentioning notebooks.");
}

const unsupportedSurface = extension.resolveSlabSurface({ languageId: "python" });
if (unsupportedSurface.canEnablePreviewMode) {
  throw new Error("Expected preview mode to stay off for non-markdown documents.");
}

if (!extension.buildMessage(unsupportedSurface).includes("Open a markdown file")) {
  throw new Error("Expected unsupported-surface messaging to steer the user toward markdown.");
}

const previewTarget = extension.resolvePreviewTarget({
  document: { languageId: "markdown", uri: { scheme: "file" } },
});

if (!previewTarget || previewTarget.kind !== "markdown") {
  throw new Error("Expected a plain markdown file to be a preview target.");
}

const cellTarget = extension.resolvePreviewTarget({
  document: { languageId: "markdown", uri: { scheme: "vscode-notebook-cell" } },
});

if (cellTarget !== null) {
  throw new Error("Expected notebook cells to be rejected as preview targets.");
}

if (extension.resolvePreviewTarget(undefined) !== null) {
  throw new Error("Expected a missing editor to produce no preview target.");
}

console.log(`Smoke passed for ${extension.COMMAND_ID}`);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node ./tests/smoke/activate.mjs`
Expected: FAIL with `Expected the preview command id to be slab.openPreview, got slab.notebookPreviewMode.`

- [ ] **Step 3: Rewrite src/extension.js markdown-only**

Replace the entire content of `src/extension.js` with:

```js
const COMMAND_ID = "slab.openPreview";
const CONTEXT_KEY = "slab.canEnablePreviewMode";
const {
  registerLatexSupport,
} = require("./editor/registerLatexSupport.js");
const {
  registerMathCommands,
} = require("./editor/registerMathCommands.js");
const {
  registerSlabSidebar,
} = require("./sidebar/registerSlabSidebar.js");
const {
  registerExternalPreview,
} = require("./preview/registerExternalPreview.js");

function resolveSlabSurface({ languageId = "", uriScheme = "" } = {}) {
  const isMarkdown = languageId === "markdown";

  return {
    languageId,
    uriScheme,
    isMarkdown,
    canEnablePreviewMode: isMarkdown,
  };
}

function getEditorSurface(editor) {
  const document = editor?.document;

  if (!document) {
    return resolveSlabSurface();
  }

  return resolveSlabSurface({
    languageId: document.languageId,
    uriScheme: document.uri?.scheme ?? "",
  });
}

function buildStatusBarText(surface) {
  return surface.isMarkdown ? "Slab: Markdown" : "Slab";
}

function buildMessage(surface) {
  if (!surface.canEnablePreviewMode) {
    return "Open a markdown file to use Slab Preview.";
  }

  return "Slab Preview opens a live compiled view of this markdown document in your external browser window.";
}

async function refreshStatusBar(vscode, statusBar, editor = vscode.window.activeTextEditor) {
  const surface = getEditorSurface(editor);
  const config = vscode.workspace.getConfiguration("slab");
  const showStatusBarEntry = config.get("showStatusBarEntry", true);

  await vscode.commands.executeCommand("setContext", CONTEXT_KEY, surface.canEnablePreviewMode);

  if (!showStatusBarEntry || !surface.canEnablePreviewMode) {
    statusBar.hide();
    return;
  }

  statusBar.text = buildStatusBarText(surface);
  statusBar.tooltip = buildMessage(surface);
  statusBar.show();
}

function activate(context) {
  const vscode = require("vscode");
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 80);

  statusBar.name = "Slab Preview";
  statusBar.command = COMMAND_ID;

  const refresh = (editor = vscode.window.activeTextEditor) =>
    refreshStatusBar(vscode, statusBar, editor);

  context.subscriptions.push(
    statusBar,
    registerMathCommands(vscode),
    registerLatexSupport(vscode),
    registerSlabSidebar(vscode, () => getEditorSurface(vscode.window.activeTextEditor)),
    registerExternalPreview(vscode, COMMAND_ID, () => buildPreviewDocument(vscode)),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      void refresh(editor);
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("slab")) {
        void refresh(vscode.window.activeTextEditor);
      }
    }),
  );

  void refresh(vscode.window.activeTextEditor);
}

function deactivate() {}

function buildPreviewDocument(vscode) {
  const target = resolvePreviewTarget(vscode.window.activeTextEditor);

  if (!target) {
    return null;
  }

  const document = target.editor.document;
  const path = require("node:path");
  const baseDir = document.uri?.scheme === "file"
    ? path.dirname(document.uri.fsPath)
    : null;

  return {
    label: document.uri?.scheme === "file"
      ? path.basename(document.uri.fsPath)
      : "Markdown",
    sourceLabel: "Markdown document",
    markdown: document.getText(),
    baseDir,
  };
}

function resolvePreviewTarget(activeTextEditor) {
  const document = activeTextEditor?.document;
  const isPlainMarkdownDocument = document?.languageId === "markdown"
    && document?.uri?.scheme !== "vscode-notebook-cell";

  if (isPlainMarkdownDocument) {
    return {
      kind: "markdown",
      editor: activeTextEditor,
    };
  }

  return null;
}

module.exports = {
  COMMAND_ID,
  CONTEXT_KEY,
  activate,
  deactivate,
  resolveSlabSurface,
  getEditorSurface,
  buildStatusBarText,
  buildMessage,
  resolvePreviewTarget,
};
```

- [ ] **Step 4: Remove notebook surfaces from the sidebar**

In `src/sidebar/registerSlabSidebar.js`:

a) Replace the `location` computation at the top of `renderSidebarHtml` (currently a nested ternary mentioning "Notebook markdown cell"):

```js
  const location = surface.isMarkdown ? "Markdown document" : "Non-markdown surface";
```

b) Replace the `support` text assignment:

```js
  const support = surface.isMarkdown
    ? "Use the controls below to insert math, apply themes, and run the core Slab commands."
    : "Open a markdown file, then use the controls below.";
```

c) Delete the two notebook action buttons entirely (the `<button class="action" onclick="runCommand('slab.createNotebookFromScaffold')">...</button>` block and the `<button class="action" onclick="runCommand('slab.exportNotebookForReview')">...</button>` block).

d) In the remaining preview button, change `runCommand('slab.notebookPreviewMode')` to `runCommand('slab.openPreview')`.

e) Remove the now-unneeded notebook refresh listener: in `registerSlabSidebar`, delete the line `vscode.window.onDidChangeActiveNotebookEditor(() => provider.refresh()),`.

- [ ] **Step 5: Drop the notebook-cell selector from LaTeX support**

In `src/editor/registerLatexSupport.js`, replace the `DOCUMENT_SELECTOR` constant with:

```js
const DOCUMENT_SELECTOR = [
  { language: "markdown", scheme: "file" },
  { language: "markdown", scheme: "untitled" },
];
```

- [ ] **Step 6: Update package.json commands and activation events**

In `package.json`:

a) Replace the `activationEvents` array with:

```json
  "activationEvents": [
    "onLanguage:markdown",
    "onView:slab.sidebar"
  ],
```

b) In `contributes.commands`, delete the entries for `slab.createNotebookFromScaffold` and `slab.exportNotebookForReview`, and change the preview entry to:

```json
      {
        "command": "slab.openPreview",
        "title": "Slab: Open Preview",
        "category": "Slab"
      },
```

(The four `slab.insert*` math command entries stay unchanged.)

- [ ] **Step 7: Run the full smoke suite**

Run: `npm run smoke`
Expected: all eight existing smoke scripts pass (the notebook pipeline tests still import their modules directly, which still exist).

- [ ] **Step 8: Commit**

```bash
git add src/extension.js src/sidebar/registerSlabSidebar.js src/editor/registerLatexSupport.js package.json tests/smoke/activate.mjs
git commit -m "refactor: make extension core markdown-only, rename preview command"
```

---

## Task 2: Delete the notebook pipeline and rebrand the manifest

**Files:**
- Delete: `src/adapter/` (parse-scaffold.js, emit-notebook.js, flatten-notebook.js)
- Delete: `src/commands/` (createNotebookFromScaffold.js, exportNotebookForReview.js, extractAttachments.js)
- Delete: `src/attachments/` (extract.js)
- Delete: `tests/smoke/extract-attachments.mjs`, `tests/smoke/flatten-notebook.mjs`, `tests/smoke/scaffold-to-notebook.mjs`, `tests/smoke/command-roundtrip.mjs`
- Delete: `tests/smoke/fixtures/with-attachment.ipynb`, `tests/smoke/fixtures/authored-notebook.ipynb`
- Modify: `package.json` (branding, version, settings, smoke script)

- [ ] **Step 1: Delete the pipeline files and notebook tests**

```bash
git rm -r src/adapter src/commands src/attachments
git rm tests/smoke/extract-attachments.mjs tests/smoke/flatten-notebook.mjs tests/smoke/scaffold-to-notebook.mjs tests/smoke/command-roundtrip.mjs
git rm tests/smoke/fixtures/with-attachment.ipynb tests/smoke/fixtures/authored-notebook.ipynb
```

Note: `src/util/atomicWrite.js` was only used by the deleted commands — check with `grep -rn "atomicWrite" src/` and if nothing else imports it, also `git rm src/util/atomicWrite.js`.

- [ ] **Step 2: Rebrand the manifest**

In `package.json`:

a) Top fields:

```json
  "name": "slab-vscode",
  "displayName": "Slab",
  "description": "Lightweight markdown companion for Culmen study notes: themed external preview, LaTeX and table authoring helpers, and Culmen-friendly image handling.",
  "version": "0.2.0",
```

b) Replace `categories` and `keywords`:

```json
  "categories": [
    "Other"
  ],
  "keywords": [
    "markdown",
    "latex",
    "math",
    "tables",
    "culmen",
    "slab"
  ],
```

c) In `contributes.configuration.properties`, delete the entire `slab.preferNotebookMarkdown` property. Keep `slab.showStatusBarEntry`, `slab.activeTheme`, and all `slab.latexColors.*` properties.

d) Replace the `smoke` script:

```json
    "smoke": "node ./tests/smoke/activate.mjs && node ./tests/smoke/block-math-delimiters.mjs && node ./tests/smoke/math-insertion.mjs && node ./tests/smoke/preview-assets.mjs",
```

- [ ] **Step 3: Run the smoke suite**

Run: `npm run smoke`
Expected: 4 scripts pass, ending with `Smoke passed for preview asset rewriting helpers.`

- [ ] **Step 4: Verify nothing still references deleted modules**

Run: `grep -rn "adapter/\|commands/createNotebook\|commands/exportNotebook\|extractAttachments\|flatten-notebook\|parse-scaffold\|emit-notebook" src/ tests/ package.json`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: delete notebook pipeline, rebrand as markdown companion (0.2.0)"
```

---

## Task 3: Popout palettes — one theme drives editor and popout

Each theme preset gains a `popout` palette. The preview server injects it as CSS variables and ships it in the `/api/document` payload so an open popout restyles live when the theme changes (the existing `onDidChangeConfiguration` listener already bumps the version).

**Files:**
- Modify: `src/sidebar/slabThemes.js`
- Modify: `src/preview/registerExternalPreview.js`
- Modify: `src/extension.js` (pass palette getter)
- Test: `tests/smoke/popout-theme.mjs` (new)
- Modify: `package.json` (smoke script)

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke/popout-theme.mjs`:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SLAB_THEME_PRESETS, resolvePopoutPalette } = require("../../src/sidebar/slabThemes.js");
const { renderPreviewShell } = require("../../src/preview/registerExternalPreview.js");

const REQUIRED_KEYS = ["colorScheme", "background", "surface", "text", "muted", "accent", "border"];

for (const [id, preset] of Object.entries(SLAB_THEME_PRESETS)) {
  if (!preset.popout || typeof preset.popout !== "object") {
    throw new Error(`Preset ${id} is missing a popout palette.`);
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof preset.popout[key] !== "string" || preset.popout[key] === "") {
      throw new Error(`Preset ${id} popout palette is missing ${key}.`);
    }
  }
}

if (resolvePopoutPalette(SLAB_THEME_PRESETS, "does-not-exist") !== SLAB_THEME_PRESETS.default.popout) {
  throw new Error("Expected unknown theme ids to fall back to the default popout palette.");
}

if (resolvePopoutPalette(SLAB_THEME_PRESETS, "miami") !== SLAB_THEME_PRESETS.miami.popout) {
  throw new Error("Expected known theme ids to resolve their own popout palette.");
}

if (resolvePopoutPalette(undefined, "default") === undefined) {
  throw new Error("Expected a missing preset map to still produce a palette.");
}

const html = renderPreviewShell(SLAB_THEME_PRESETS.miami.popout);
if (!html.includes(`--slab-bg: ${SLAB_THEME_PRESETS.miami.popout.background}`)) {
  throw new Error("Expected the preview shell to inject the palette background variable.");
}

if (!html.includes(`color-scheme: ${SLAB_THEME_PRESETS.miami.popout.colorScheme}`)) {
  throw new Error("Expected the preview shell to set the palette color scheme.");
}

const fallbackHtml = renderPreviewShell();
if (!fallbackHtml.includes(`--slab-bg: ${SLAB_THEME_PRESETS.default.popout.background}`)) {
  throw new Error("Expected the preview shell to fall back to the default palette.");
}

console.log("Smoke passed for popout theme palettes.");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node ./tests/smoke/popout-theme.mjs`
Expected: FAIL with `Preset default is missing a popout palette.`

- [ ] **Step 3: Add popout palettes and the resolver to slabThemes.js**

In `src/sidebar/slabThemes.js`, add a `popout` object to every preset (keep the existing `colors` objects untouched), and export `resolvePopoutPalette`:

```js
  default: {
    label: "Default",
    description: "Clean neon contrast tuned for dark editors.",
    colors: { /* unchanged */ },
    popout: {
      colorScheme: "dark",
      background: "#111111",
      surface: "#171717",
      text: "#f2efe8",
      muted: "#9a9488",
      accent: "#27d797",
      border: "#2c2c2c",
    },
  },
  miami: {
    /* label/description/colors unchanged */
    popout: {
      colorScheme: "dark",
      background: "#14101c",
      surface: "#1c1626",
      text: "#f5ecff",
      muted: "#9b8fb0",
      accent: "#ff4fa3",
      border: "#322843",
    },
  },
  crystal: {
    /* unchanged */
    popout: {
      colorScheme: "dark",
      background: "#0d1420",
      surface: "#131c2c",
      text: "#e8f4ff",
      muted: "#8fa3bd",
      accent: "#93c5fd",
      border: "#233448",
    },
  },
  sand: {
    /* unchanged */
    popout: {
      colorScheme: "dark",
      background: "#1a1612",
      surface: "#221d17",
      text: "#f4f1de",
      muted: "#a89a85",
      accent: "#f6bd60",
      border: "#38302a",
    },
  },
  papyrus: {
    /* unchanged */
    popout: {
      colorScheme: "light",
      background: "#f7f1e3",
      surface: "#efe6d2",
      text: "#2b2419",
      muted: "#8a7d68",
      accent: "#e76f51",
      border: "#d8cbb2",
    },
  },
```

After the `SLAB_THEME_PRESETS` object, add:

```js
function resolvePopoutPalette(presets, themeId) {
  return presets?.[themeId]?.popout
    || presets?.default?.popout
    || SLAB_THEME_PRESETS.default.popout;
}

module.exports = {
  SLAB_THEME_PRESETS,
  resolvePopoutPalette,
};
```

- [ ] **Step 4: Theme the preview shell and payload**

In `src/preview/registerExternalPreview.js`:

a) Change the function signature and store the palette getter:

```js
function registerExternalPreview(vscode, commandId, getPreviewDocument, getPopoutPalette) {
  const state = {
    server: null,
    refreshTimer: null,
    port: null,
    version: 0,
    current: null,
    getPalette: typeof getPopoutPalette === "function" ? getPopoutPalette : () => null,
  };
```

b) Delete the `vscode.window.onDidChangeActiveNotebookEditor(...)` listener from the returned `Disposable.from(...)` list (markdown-only now).

c) In `handleRequest`, pass the palette to the shell and the payload:

```js
  if (url.pathname === "/preview") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(renderPreviewShell(state.getPalette()));
    return;
  }

  if (url.pathname === "/api/document") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    const palette = state.getPalette();
    response.end(JSON.stringify(state.current ? {
      version: state.version,
      label: state.current.label,
      sourceLabel: state.current.sourceLabel,
      markdown: state.current.markdown,
      palette,
    } : {
      version: state.version,
      label: "Slab Preview",
      sourceLabel: "Unavailable",
      markdown: "Open a markdown file to preview compiled markdown, LaTeX, and images.",
      palette,
    }));
    return;
  }
```

d) Replace `renderPreviewShell()` so it takes a palette and uses CSS variables. The default fallback keeps today's look:

```js
const FALLBACK_PALETTE = {
  colorScheme: "dark",
  background: "#111111",
  surface: "#171717",
  text: "#f2efe8",
  muted: "#9a9488",
  accent: "#27d797",
  border: "#2c2c2c",
};

function renderPreviewShell(palette) {
  const theme = { ...FALLBACK_PALETTE, ...(palette || {}) };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        color-scheme: ${theme.colorScheme};
        --slab-bg: ${theme.background};
        --slab-surface: ${theme.surface};
        --slab-text: ${theme.text};
        --slab-muted: ${theme.muted};
        --slab-accent: ${theme.accent};
        --slab-border: ${theme.border};
      }
      body {
        margin: 0;
        background: var(--slab-bg);
        color: var(--slab-text);
        font-family: Georgia, "Times New Roman", serif;
      }
      .shell {
        max-width: 920px;
        margin: 0 auto;
        padding: 24px 28px 48px;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }
      .eyebrow {
        font: 600 11px/1.2 system-ui, sans-serif;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--slab-muted);
        margin-bottom: 6px;
      }
      h1 {
        margin: 0;
        font: 700 24px/1.05 system-ui, sans-serif;
      }
      button {
        border: 1px solid var(--slab-border);
        background: transparent;
        color: var(--slab-text);
        padding: 7px 12px;
        cursor: pointer;
        font: 500 12px/1.2 system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      button:hover {
        border-color: var(--slab-accent);
        color: var(--slab-accent);
      }
      article {
        line-height: 1.7;
        font-size: 18px;
      }
      article h1, article h2, article h3, article h4 {
        font-family: system-ui, sans-serif;
        line-height: 1.15;
        margin-top: 1.5em;
      }
      article a {
        color: var(--slab-accent);
      }
      article pre {
        overflow-x: auto;
        padding: 12px 14px;
        border: 1px solid var(--slab-border);
        background: var(--slab-surface);
      }
      article code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      article img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.2em 0;
      }
      article table {
        border-collapse: collapse;
        width: 100%;
        margin: 1.2em 0;
      }
      article th, article td {
        border: 1px solid var(--slab-border);
        padding: 6px 8px;
        text-align: left;
      }
      article th {
        background: var(--slab-surface);
      }
      article blockquote {
        margin: 1.2em 0;
        padding: 2px 14px;
        border-left: 2px solid var(--slab-accent);
        color: var(--slab-muted);
      }
      article hr {
        border: none;
        border-top: 1px solid var(--slab-border);
        margin: 1.8em 0;
      }
    </style>
    <script>
      window.MathJax = {
        tex: {
          inlineMath: [['$', '$']],
          displayMath: [['$$', '$$']]
        },
        options: {
          skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
        }
      };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
  </head>
  <body>
    <div class="shell">
      <div class="topbar">
        <div>
          <div class="eyebrow" id="source-label">Loading</div>
          <h1 id="title">Slab Preview</h1>
        </div>
        <button id="refresh">Refresh</button>
      </div>
      <article id="content"></article>
    </div>
    <script>
      let currentVersion = -1;
      const title = document.getElementById('title');
      const sourceLabel = document.getElementById('source-label');
      const content = document.getElementById('content');
      const refreshButton = document.getElementById('refresh');

      function applyPalette(palette) {
        if (!palette) {
          return;
        }

        const root = document.documentElement;
        root.style.colorScheme = palette.colorScheme || 'dark';
        root.style.setProperty('--slab-bg', palette.background);
        root.style.setProperty('--slab-surface', palette.surface);
        root.style.setProperty('--slab-text', palette.text);
        root.style.setProperty('--slab-muted', palette.muted);
        root.style.setProperty('--slab-accent', palette.accent);
        root.style.setProperty('--slab-border', palette.border);
      }

      async function applyPayload(payload) {
        if (!payload || payload.version === currentVersion) {
          return;
        }

        currentVersion = payload.version;
        applyPalette(payload.palette);
        title.textContent = payload.label || 'Slab Preview';
        sourceLabel.textContent = payload.sourceLabel || 'Preview';
        content.innerHTML = marked.parse(payload.markdown || '', { gfm: true, breaks: false });

        if (window.MathJax?.typesetPromise) {
          await window.MathJax.typesetPromise([content]);
        }
      }

      async function refresh() {
        const response = await fetch('/api/document', { cache: 'no-store' });
        const payload = await response.json();
        await applyPayload(payload);
      }

      refreshButton.addEventListener('click', () => {
        void refresh();
      });

      setInterval(() => {
        void refresh();
      }, 700);

      void refresh();
    </script>
  </body>
</html>`;
}
```

e) Add `renderPreviewShell` to the module exports:

```js
module.exports = {
  detectMimeType,
  isPathInsideBaseDir,
  registerExternalPreview,
  renderPreviewShell,
  resolvePreviewAssetUrl,
  rewritePreviewAssetPaths,
};
```

- [ ] **Step 5: Pass the palette getter from extension.js**

In `src/extension.js`:

a) Add to the requires at the top:

```js
const {
  SLAB_THEME_PRESETS,
  resolvePopoutPalette,
} = require("./sidebar/slabThemes.js");
```

b) Replace the `registerExternalPreview(...)` line in `activate` with:

```js
    registerExternalPreview(
      vscode,
      COMMAND_ID,
      () => buildPreviewDocument(vscode),
      () => resolvePopoutPalette(
        SLAB_THEME_PRESETS,
        vscode.workspace.getConfiguration("slab").get("activeTheme", "default"),
      ),
    ),
```

- [ ] **Step 6: Add the test to the smoke script and run**

In `package.json`, append to the `smoke` script: `&& node ./tests/smoke/popout-theme.mjs`

Run: `npm run smoke`
Expected: 5 scripts pass, ending with `Smoke passed for popout theme palettes.`

- [ ] **Step 7: Commit**

```bash
git add src/sidebar/slabThemes.js src/preview/registerExternalPreview.js src/extension.js tests/smoke/popout-theme.mjs package.json
git commit -m "feat: theme presets drive the popout preview palette"
```

---

## Task 4: Table model — pure core (TDD)

A dependency-free module that parses, formats, navigates, and edits GFM pipe tables. No `vscode` imports.

**Files:**
- Create: `src/editor/tableModel.js`
- Test: `tests/smoke/table-model.mjs` (new)
- Modify: `package.json` (smoke script)

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke/table-model.mjs`:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isTableLine,
  parseTable,
  formatTable,
  locateColumn,
  cellStartCharacter,
  moveCell,
  insertRowBelow,
  deleteRow,
  insertColumnRight,
  deleteColumn,
} = require("../../src/editor/tableModel.js");

const lines = [
  "Intro text",
  "| Name | Score |",
  "| --- | ---: |",
  "| Ada | 9 |",
  "| Grace Hopper | 10 |",
  "",
  "Outro",
];

if (isTableLine("Intro text")) {
  throw new Error("Expected plain text to not count as a table line.");
}

if (!isTableLine("  | a |")) {
  throw new Error("Expected an indented pipe row to count as a table line.");
}

if (parseTable(lines, 0) !== null) {
  throw new Error("Expected parseTable to return null outside a table.");
}

const table = parseTable(lines, 3);
if (!table || table.start !== 1 || table.end !== 4) {
  throw new Error(`Expected table range 1-4, got ${JSON.stringify(table && [table.start, table.end])}.`);
}

if (table.separatorIndex !== 1 || table.columnCount !== 2) {
  throw new Error("Expected separator at row 1 and two columns.");
}

if (table.alignments[0] !== "none" || table.alignments[1] !== "right") {
  throw new Error(`Expected alignments [none, right], got ${JSON.stringify(table.alignments)}.`);
}

const formatted = formatTable(table);
const expected = [
  "| Name         | Score |",
  "| ------------ | ----: |",
  "| Ada          |     9 |",
  "| Grace Hopper |    10 |",
];

if (JSON.stringify(formatted) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected formatting:\n${formatted.join("\n")}`);
}

const centered = parseTable(["| h |", "| :-: |", "| x |"], 0);
if (centered.alignments[0] !== "center") {
  throw new Error("Expected :-: to parse as center alignment.");
}

if (formatTable(centered)[1] !== "| :-: |") {
  throw new Error(`Expected a centered separator, got ${formatTable(centered)[1]}.`);
}

const escaped = parseTable(["| a \\| b | c |", "| --- | --- |"], 0);
if (escaped.columnCount !== 2 || escaped.rows[0][0] !== "a \\| b") {
  throw new Error(`Expected escaped pipes to stay inside one cell, got ${JSON.stringify(escaped.rows[0])}.`);
}

if (locateColumn("| Ada | 9 |", 3) !== 0 || locateColumn("| Ada | 9 |", 8) !== 1) {
  throw new Error("Expected locateColumn to map characters to cell indexes.");
}

if (cellStartCharacter("| Ada          |     9 |", 0) !== 2) {
  throw new Error("Expected cell 0 to start at character 2.");
}

if (cellStartCharacter("| Ada          |     9 |", 1) !== 17) {
  throw new Error(`Expected cell 1 to start at character 17, got ${cellStartCharacter("| Ada          |     9 |", 1)}.`);
}

const next = moveCell(table, 0, 1, 1);
if (!next || next.rowIndex !== 2 || next.colIndex !== 0) {
  throw new Error(`Expected Tab from header Score to land on Ada, got ${JSON.stringify(next)}.`);
}

if (moveCell(table, 0, 0, -1) !== null) {
  throw new Error("Expected Shift+Tab from the first cell to return null.");
}

if (moveCell(table, 3, 1, 1) !== null) {
  throw new Error("Expected Tab from the last cell to return null.");
}

if (moveCell(table, 1, 0, 1) !== null) {
  throw new Error("Expected moveCell from the separator row to return null.");
}

const withRow = insertRowBelow(table, 0);
if (withRow.rows.length !== 5 || withRow.rows[2].join("") !== "") {
  throw new Error("Expected insertRowBelow from the header to insert an empty row after the separator.");
}

const withRowMid = insertRowBelow(table, 2);
if (withRowMid.rows[3].join("") !== "") {
  throw new Error("Expected insertRowBelow to insert after the cursor row.");
}

if (deleteRow(table, 0) !== null || deleteRow(table, 1) !== null) {
  throw new Error("Expected deleteRow to refuse the header and separator rows.");
}

const withoutRow = deleteRow(table, 2);
if (withoutRow.rows.length !== 3 || withoutRow.rows[2][0] !== "Grace Hopper") {
  throw new Error("Expected deleteRow to remove the body row.");
}

const widened = insertColumnRight(table, 0);
if (widened.columnCount !== 3 || widened.rows[0][1] !== "" || widened.alignments[1] !== "none") {
  throw new Error("Expected insertColumnRight to add an empty unaligned column.");
}

if (widened.rows[1][1] !== "---") {
  throw new Error("Expected the separator row to gain a dash cell.");
}

const narrowed = deleteColumn(table, 1);
if (narrowed.columnCount !== 1 || narrowed.rows[0].length !== 1) {
  throw new Error("Expected deleteColumn to drop the column.");
}

const single = parseTable(["| only |", "| --- |"], 0);
if (deleteColumn(single, 0) !== null) {
  throw new Error("Expected deleteColumn to refuse removing the last column.");
}

console.log("Smoke passed for table model.");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node ./tests/smoke/table-model.mjs`
Expected: FAIL with `Cannot find module '../../src/editor/tableModel.js'`

- [ ] **Step 3: Implement src/editor/tableModel.js**

```js
/**
 * Pure pipe-table model for markdown editing helpers.
 *
 * Row indexes throughout are relative to the table block (0 = header).
 * The functions never touch lines outside the detected table block.
 */
const SEPARATOR_CELL_PATTERN = /^:?-+:?$/;

function isTableLine(line) {
  return String(line || "").trimStart().startsWith("|");
}

function findTableRange(lines, cursorLine) {
  if (cursorLine < 0 || cursorLine >= lines.length || !isTableLine(lines[cursorLine])) {
    return null;
  }

  let start = cursorLine;
  let end = cursorLine;
  while (start > 0 && isTableLine(lines[start - 1])) {
    start -= 1;
  }
  while (end + 1 < lines.length && isTableLine(lines[end + 1])) {
    end += 1;
  }

  return { start, end };
}

function splitRow(line) {
  const inner = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === "\\" && inner[i + 1] === "|") {
      current += "\\|";
      i += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_PATTERN.test(cell));
}

function parseTable(lines, cursorLine) {
  const range = findTableRange(lines, cursorLine);
  if (!range) {
    return null;
  }

  const rows = [];
  let separatorIndex = -1;

  for (let i = range.start; i <= range.end; i += 1) {
    const cells = splitRow(lines[i]);
    if (separatorIndex === -1 && rows.length === 1 && isSeparatorRow(cells)) {
      separatorIndex = rows.length;
    }
    rows.push(cells);
  }

  const columnCount = Math.max(...rows.map((row) => row.length));

  return {
    start: range.start,
    end: range.end,
    rows,
    separatorIndex,
    columnCount,
    alignments: readAlignments(rows, separatorIndex, columnCount),
  };
}

function readAlignments(rows, separatorIndex, columnCount) {
  const alignments = new Array(columnCount).fill("none");
  if (separatorIndex === -1) {
    return alignments;
  }

  rows[separatorIndex].forEach((cell, index) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    alignments[index] = left && right ? "center" : right ? "right" : left ? "left" : "none";
  });

  return alignments;
}

function formatTable(table) {
  const widths = new Array(table.columnCount).fill(3);

  table.rows.forEach((cells, rowIndex) => {
    if (rowIndex === table.separatorIndex) {
      return;
    }
    cells.forEach((cell, colIndex) => {
      widths[colIndex] = Math.max(widths[colIndex], cell.length);
    });
  });

  return table.rows.map((cells, rowIndex) => {
    if (rowIndex === table.separatorIndex) {
      const pieces = widths.map((width, colIndex) =>
        buildSeparatorCell(width, table.alignments[colIndex]));
      return `| ${pieces.join(" | ")} |`;
    }

    const padded = widths.map((width, colIndex) =>
      padCell(cells[colIndex] ?? "", width, table.alignments[colIndex]));
    return `| ${padded.join(" | ")} |`;
  });
}

function buildSeparatorCell(width, alignment) {
  if (alignment === "center") {
    return `:${"-".repeat(Math.max(width - 2, 1))}:`;
  }
  if (alignment === "right") {
    return `${"-".repeat(Math.max(width - 1, 1))}:`;
  }
  if (alignment === "left") {
    return `:${"-".repeat(Math.max(width - 1, 1))}`;
  }
  return "-".repeat(width);
}

function padCell(cell, width, alignment) {
  const gap = width - cell.length;
  if (gap <= 0) {
    return cell;
  }
  if (alignment === "right") {
    return " ".repeat(gap) + cell;
  }
  if (alignment === "center") {
    const leftPad = Math.floor(gap / 2);
    return " ".repeat(leftPad) + cell + " ".repeat(gap - leftPad);
  }
  return cell + " ".repeat(gap);
}

function locateColumn(lineText, character) {
  const text = String(lineText || "");
  let pipes = 0;

  for (let i = 0; i < Math.min(character, text.length); i += 1) {
    if (text[i] === "|" && text[i - 1] !== "\\") {
      pipes += 1;
    }
  }

  return Math.max(pipes - 1, 0);
}

function cellStartCharacter(formattedLine, colIndex) {
  const text = String(formattedLine || "");
  let pipes = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "|" && text[i - 1] !== "\\") {
      if (pipes === colIndex) {
        return Math.min(i + 2, text.length);
      }
      pipes += 1;
    }
  }

  return text.length;
}

function moveCell(table, rowIndex, colIndex, delta) {
  const rows = table.rows.map((_, i) => i).filter((i) => i !== table.separatorIndex);
  const rowPosition = rows.indexOf(rowIndex);
  if (rowPosition === -1) {
    return null;
  }

  const flatIndex = rowPosition * table.columnCount + colIndex + delta;
  if (flatIndex < 0 || flatIndex >= rows.length * table.columnCount) {
    return null;
  }

  return {
    rowIndex: rows[Math.floor(flatIndex / table.columnCount)],
    colIndex: flatIndex % table.columnCount,
  };
}

function insertRowBelow(table, rowIndex) {
  const empty = new Array(table.columnCount).fill("");
  const minRow = table.separatorIndex === -1 ? 0 : table.separatorIndex;
  const insertAt = Math.max(rowIndex, minRow) + 1;
  const rows = [...table.rows];
  rows.splice(insertAt, 0, empty);
  return { ...table, rows };
}

function deleteRow(table, rowIndex) {
  if (rowIndex === 0 || rowIndex === table.separatorIndex) {
    return null;
  }
  return { ...table, rows: table.rows.filter((_, i) => i !== rowIndex) };
}

function insertColumnRight(table, colIndex) {
  const rows = table.rows.map((cells, rowIndex) => {
    const next = [...cells];
    while (next.length < table.columnCount) {
      next.push(rowIndex === table.separatorIndex ? "---" : "");
    }
    next.splice(colIndex + 1, 0, rowIndex === table.separatorIndex ? "---" : "");
    return next;
  });
  const alignments = [...table.alignments];
  alignments.splice(colIndex + 1, 0, "none");
  return { ...table, rows, alignments, columnCount: table.columnCount + 1 };
}

function deleteColumn(table, colIndex) {
  if (table.columnCount <= 1) {
    return null;
  }
  return {
    ...table,
    rows: table.rows.map((cells) => cells.filter((_, i) => i !== colIndex)),
    alignments: table.alignments.filter((_, i) => i !== colIndex),
    columnCount: table.columnCount - 1,
  };
}

module.exports = {
  isTableLine,
  findTableRange,
  parseTable,
  formatTable,
  locateColumn,
  cellStartCharacter,
  moveCell,
  insertRowBelow,
  deleteRow,
  insertColumnRight,
  deleteColumn,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node ./tests/smoke/table-model.mjs`
Expected: `Smoke passed for table model.`

- [ ] **Step 5: Add to smoke script and run the suite**

In `package.json`, append to the `smoke` script: `&& node ./tests/smoke/table-model.mjs`

Run: `npm run smoke`
Expected: 6 scripts pass.

- [ ] **Step 6: Commit**

```bash
git add src/editor/tableModel.js tests/smoke/table-model.mjs package.json
git commit -m "feat: pure pipe-table model (parse, format, navigate, edit)"
```

---

## Task 5: Table helpers — VS Code wiring, keybindings, context key

**Files:**
- Create: `src/editor/registerTableHelpers.js`
- Modify: `src/extension.js` (wire it up)
- Modify: `package.json` (commands + keybindings)

- [ ] **Step 1: Implement src/editor/registerTableHelpers.js**

```js
const {
  isTableLine,
  parseTable,
  formatTable,
  locateColumn,
  cellStartCharacter,
  moveCell,
  insertRowBelow,
  deleteRow,
  insertColumnRight,
  deleteColumn,
} = require("./tableModel.js");

const IN_TABLE_CONTEXT = "slab.inTable";

function registerTableHelpers(vscode) {
  const updateContext = (editor = vscode.window.activeTextEditor) => {
    const document = editor?.document;
    const inTable = Boolean(
      document
      && document.languageId === "markdown"
      && editor.selection
      && isTableLine(document.lineAt(editor.selection.active.line).text),
    );
    void vscode.commands.executeCommand("setContext", IN_TABLE_CONTEXT, inTable);
  };

  const readLines = (document) => {
    const lines = [];
    for (let i = 0; i < document.lineCount; i += 1) {
      lines.push(document.lineAt(i).text);
    }
    return lines;
  };

  const withTable = (handler) => async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      return;
    }

    const lines = readLines(editor.document);
    const cursor = editor.selection.active;
    const table = parseTable(lines, cursor.line);

    if (!table) {
      vscode.window.setStatusBarMessage("Slab: the cursor is not inside a markdown table.", 2500);
      return;
    }

    await handler(editor, table, cursor, lines);
  };

  const replaceTable = async (editor, table, formattedLines) => {
    const lastLineLength = editor.document.lineAt(table.end).text.length;
    const range = new vscode.Range(table.start, 0, table.end, lastLineLength);
    await editor.edit((edit) => edit.replace(range, formattedLines.join("\n")));
  };

  const placeCursor = (editor, table, formattedLines, rowIndex, colIndex) => {
    const line = table.start + rowIndex;
    const character = cellStartCharacter(formattedLines[rowIndex], colIndex);
    editor.selection = new vscode.Selection(line, character, line, character);
  };

  const navigate = (delta) => withTable(async (editor, table, cursor, lines) => {
    const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
    const target = moveCell(table, cursor.line - table.start, colIndex, delta);
    const formatted = formatTable(table);
    await replaceTable(editor, table, formatted);

    if (target) {
      placeCursor(editor, table, formatted, target.rowIndex, target.colIndex);
    }
  });

  updateContext();

  return vscode.Disposable.from(
    vscode.commands.registerCommand("slab.formatTable", withTable(async (editor, table) => {
      await replaceTable(editor, table, formatTable(table));
    })),
    vscode.commands.registerCommand("slab.tableNextCell", navigate(1)),
    vscode.commands.registerCommand("slab.tablePrevCell", navigate(-1)),
    vscode.commands.registerCommand(
      "slab.tableInsertRowBelow",
      withTable(async (editor, table, cursor) => {
        const updated = insertRowBelow(table, cursor.line - table.start);
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableDeleteRow",
      withTable(async (editor, table, cursor) => {
        const updated = deleteRow(table, cursor.line - table.start);
        if (!updated) {
          vscode.window.setStatusBarMessage("Slab: cannot delete the header or separator row.", 2500);
          return;
        }
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableInsertColumnRight",
      withTable(async (editor, table, cursor, lines) => {
        const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
        const updated = insertColumnRight(table, colIndex);
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableDeleteColumn",
      withTable(async (editor, table, cursor, lines) => {
        const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
        const updated = deleteColumn(table, colIndex);
        if (!updated) {
          vscode.window.setStatusBarMessage("Slab: a table needs at least one column.", 2500);
          return;
        }
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      updateContext(event.textEditor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateContext(editor);
    }),
  );
}

module.exports = {
  IN_TABLE_CONTEXT,
  registerTableHelpers,
};
```

Commands registered: `slab.formatTable`, `slab.tableNextCell`, `slab.tablePrevCell`, `slab.tableInsertRowBelow`, `slab.tableDeleteRow`, `slab.tableInsertColumnRight`, `slab.tableDeleteColumn`.

- [ ] **Step 2: Wire into extension.js**

In `src/extension.js`, add to the requires:

```js
const {
  registerTableHelpers,
} = require("./editor/registerTableHelpers.js");
```

and add `registerTableHelpers(vscode),` to the `context.subscriptions.push(...)` list (after `registerLatexSupport(vscode),`).

- [ ] **Step 3: Add commands and keybindings to package.json**

In `contributes.commands`, add:

```json
      {
        "command": "slab.formatTable",
        "title": "Slab: Format Table",
        "category": "Slab"
      },
      {
        "command": "slab.tableNextCell",
        "title": "Slab: Table Next Cell",
        "category": "Slab"
      },
      {
        "command": "slab.tablePrevCell",
        "title": "Slab: Table Previous Cell",
        "category": "Slab"
      },
      {
        "command": "slab.tableInsertRowBelow",
        "title": "Slab: Table Insert Row Below",
        "category": "Slab"
      },
      {
        "command": "slab.tableDeleteRow",
        "title": "Slab: Table Delete Row",
        "category": "Slab"
      },
      {
        "command": "slab.tableInsertColumnRight",
        "title": "Slab: Table Insert Column Right",
        "category": "Slab"
      },
      {
        "command": "slab.tableDeleteColumn",
        "title": "Slab: Table Delete Column",
        "category": "Slab"
      }
```

In `contributes` (sibling of `commands`), add:

```json
    "keybindings": [
      {
        "key": "tab",
        "command": "slab.tableNextCell",
        "when": "editorTextFocus && !editorReadonly && editorLangId == markdown && slab.inTable && !suggestWidgetVisible && !inSnippetMode && !editorHasSelection"
      },
      {
        "key": "shift+tab",
        "command": "slab.tablePrevCell",
        "when": "editorTextFocus && !editorReadonly && editorLangId == markdown && slab.inTable && !suggestWidgetVisible && !inSnippetMode && !editorHasSelection"
      }
    ],
```

- [ ] **Step 4: Run the smoke suite**

Run: `npm run smoke`
Expected: 6 scripts pass (no new smoke test in this task — the wiring is VS Code API surface; the logic is covered by `table-model.mjs`).

- [ ] **Step 5: Manual check in the Extension Development Host**

Press F5, open a markdown file with a messy pipe table, and verify: Tab jumps cells and aligns the table, Shift+Tab goes back, Tab in normal prose still indents/accepts suggestions, and `Slab: Table Insert Row Below` adds a row.

- [ ] **Step 6: Commit**

```bash
git add src/editor/registerTableHelpers.js src/extension.js package.json
git commit -m "feat: table editing commands with scoped Tab navigation"
```

---

## Task 6: Asset path completion (TDD)

**Files:**
- Create: `src/editor/assetPaths.js` (pure core)
- Create: `src/editor/registerAssetCompletion.js` (wiring)
- Create: `tests/smoke/fixtures/asset-note/assets/plot.png`, `tests/smoke/fixtures/asset-note/assets/diagram.svg`, `tests/smoke/fixtures/asset-note/assets/notes.txt` (fixture files, content irrelevant)
- Test: `tests/smoke/asset-paths.mjs` (new)
- Modify: `src/extension.js`, `package.json`

- [ ] **Step 1: Create the fixture files**

```bash
mkdir -p tests/smoke/fixtures/asset-note/assets
printf 'png' > tests/smoke/fixtures/asset-note/assets/plot.png
printf 'svg' > tests/smoke/fixtures/asset-note/assets/diagram.svg
printf 'txt' > tests/smoke/fixtures/asset-note/assets/notes.txt
```

- [ ] **Step 2: Write the failing smoke test**

Create `tests/smoke/asset-paths.mjs`:

```js
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { matchImageLinkPrefix, listAssetPaths } = require("../../src/editor/assetPaths.js");

const insideLink = matchImageLinkPrefix("Some text ![alt](ass");
if (!insideLink || insideLink.typed !== "ass") {
  throw new Error(`Expected to match inside an image link, got ${JSON.stringify(insideLink)}.`);
}

const dotSlash = matchImageLinkPrefix("![](./assets/");
if (!dotSlash || dotSlash.typed !== "./assets/") {
  throw new Error("Expected ./assets/ prefixes to match.");
}

const emptyTarget = matchImageLinkPrefix("![diagram](");
if (!emptyTarget || emptyTarget.typed !== "") {
  throw new Error("Expected an empty link target to match.");
}

if (matchImageLinkPrefix("plain text") !== null) {
  throw new Error("Expected plain text to not match.");
}

if (matchImageLinkPrefix("[link](ass") !== null) {
  throw new Error("Expected non-image links to not match.");
}

if (matchImageLinkPrefix("![alt](assets/x.png) done") !== null) {
  throw new Error("Expected closed links to not match.");
}

const fixtureDir = path.resolve("tests/smoke/fixtures/asset-note");
const assets = listAssetPaths(fixtureDir);
if (JSON.stringify(assets) !== JSON.stringify(["assets/diagram.svg", "assets/plot.png"])) {
  throw new Error(`Expected sorted image assets only, got ${JSON.stringify(assets)}.`);
}

const missing = listAssetPaths(path.resolve("tests/smoke/fixtures"));
if (!Array.isArray(missing) || missing.length !== 0) {
  throw new Error("Expected a missing assets folder to produce an empty list.");
}

console.log("Smoke passed for asset path completion helpers.");
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node ./tests/smoke/asset-paths.mjs`
Expected: FAIL with `Cannot find module '../../src/editor/assetPaths.js'`

- [ ] **Step 4: Implement src/editor/assetPaths.js**

```js
const fs = require("node:fs");
const path = require("node:path");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function matchImageLinkPrefix(linePrefix) {
  const match = String(linePrefix || "").match(/!\[[^\]]*\]\(([^)]*)$/);
  if (!match) {
    return null;
  }

  return { typed: match[1] };
}

function listAssetPaths(documentDir, fsModule = fs) {
  const assetsDir = path.join(documentDir, "assets");
  let entries;

  try {
    entries = fsModule.readdirSync(assetsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => `assets/${entry.name}`)
    .sort();
}

module.exports = {
  matchImageLinkPrefix,
  listAssetPaths,
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node ./tests/smoke/asset-paths.mjs`
Expected: `Smoke passed for asset path completion helpers.`

- [ ] **Step 6: Implement the completion provider wiring**

Create `src/editor/registerAssetCompletion.js`:

```js
const path = require("node:path");
const { matchImageLinkPrefix, listAssetPaths } = require("./assetPaths.js");

function registerAssetCompletion(vscode) {
  return vscode.languages.registerCompletionItemProvider(
    [{ language: "markdown", scheme: "file" }],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const link = matchImageLinkPrefix(linePrefix);
        if (!link) {
          return [];
        }

        const documentDir = path.dirname(document.uri.fsPath);
        const assetPaths = listAssetPaths(documentDir);
        if (assetPaths.length === 0) {
          return [];
        }

        const useDotSlash = link.typed.startsWith("./");
        const replaceRange = new vscode.Range(
          position.line,
          position.character - link.typed.length,
          position.line,
          position.character,
        );

        return assetPaths.map((assetPath) => {
          const insertPath = useDotSlash ? `./${assetPath}` : assetPath;
          const item = new vscode.CompletionItem(insertPath, vscode.CompletionItemKind.File);
          item.detail = "Slab asset";
          item.insertText = insertPath;
          item.range = replaceRange;
          return item;
        });
      },
    },
    "(",
    "/",
  );
}

module.exports = {
  registerAssetCompletion,
};
```

- [ ] **Step 7: Wire into extension.js and the smoke script**

In `src/extension.js`, add to the requires:

```js
const {
  registerAssetCompletion,
} = require("./editor/registerAssetCompletion.js");
```

and add `registerAssetCompletion(vscode),` to `context.subscriptions.push(...)`.

In `package.json`, append to the `smoke` script: `&& node ./tests/smoke/asset-paths.mjs`

Run: `npm run smoke`
Expected: 7 scripts pass.

- [ ] **Step 8: Commit**

```bash
git add src/editor/assetPaths.js src/editor/registerAssetCompletion.js src/extension.js tests/smoke/asset-paths.mjs tests/smoke/fixtures/asset-note package.json
git commit -m "feat: complete image paths from the assets/ folder"
```

---

## Task 7: Culmen asset layout command + sidebar button

**Files:**
- Create: `src/commands/useCulmenAssetLayout.js`
- Modify: `src/extension.js`, `src/sidebar/registerSlabSidebar.js`, `package.json`
- Test: `tests/smoke/culmen-asset-layout.mjs` (new)

- [ ] **Step 1: Write the failing smoke test**

Create `tests/smoke/culmen-asset-layout.mjs`:

```js
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CULMEN_DESTINATION,
  planCopyDestinationUpdate,
} = require("../../src/commands/useCulmenAssetLayout.js");

if (JSON.stringify(CULMEN_DESTINATION) !== JSON.stringify({ "**/*.md": "assets/" })) {
  throw new Error(`Expected the Culmen destination mapping, got ${JSON.stringify(CULMEN_DESTINATION)}.`);
}

if (planCopyDestinationUpdate(undefined) !== "write") {
  throw new Error("Expected an unset value to be written directly.");
}

if (planCopyDestinationUpdate(null) !== "write") {
  throw new Error("Expected a null value to be written directly.");
}

if (planCopyDestinationUpdate({ "**/*.md": "assets/" }) !== "noop") {
  throw new Error("Expected an identical value to be a no-op.");
}

if (planCopyDestinationUpdate({ "**/*.md": "img/" }) !== "confirm") {
  throw new Error("Expected a different value to require confirmation.");
}

console.log("Smoke passed for Culmen asset layout planning.");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node ./tests/smoke/culmen-asset-layout.mjs`
Expected: FAIL with `Cannot find module '../../src/commands/useCulmenAssetLayout.js'`

- [ ] **Step 3: Implement src/commands/useCulmenAssetLayout.js**

```js
const COMMAND_ID = "slab.useCulmenAssetLayout";
const DESTINATION_KEY = "copyFiles.destination";
const CULMEN_DESTINATION = { "**/*.md": "assets/" };

function planCopyDestinationUpdate(existingGlobalValue) {
  if (existingGlobalValue === undefined || existingGlobalValue === null) {
    return "write";
  }
  if (JSON.stringify(existingGlobalValue) === JSON.stringify(CULMEN_DESTINATION)) {
    return "noop";
  }
  return "confirm";
}

function registerUseCulmenAssetLayoutCommand(vscode) {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const config = vscode.workspace.getConfiguration("markdown");
    const existing = config.inspect(DESTINATION_KEY)?.globalValue;
    const plan = planCopyDestinationUpdate(existing);

    if (plan === "noop") {
      await vscode.window.showInformationMessage(
        "Slab: pasted images already land in assets/ next to each note.",
      );
      return;
    }

    if (plan === "confirm") {
      const choice = await vscode.window.showWarningMessage(
        "markdown.copyFiles.destination already has a custom value. Replace it so pasted images land in assets/ next to each note?",
        "Replace",
        "Cancel",
      );
      if (choice !== "Replace") {
        return;
      }
    }

    await config.update(DESTINATION_KEY, CULMEN_DESTINATION, vscode.ConfigurationTarget.Global);
    await vscode.window.showInformationMessage(
      "Slab: pasted images will now be saved to assets/ next to each markdown note.",
    );
  });
}

module.exports = {
  COMMAND_ID,
  CULMEN_DESTINATION,
  planCopyDestinationUpdate,
  registerUseCulmenAssetLayoutCommand,
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node ./tests/smoke/culmen-asset-layout.mjs`
Expected: `Smoke passed for Culmen asset layout planning.`

- [ ] **Step 5: Wire into extension.js, sidebar, and manifest**

a) In `src/extension.js`, add to the requires:

```js
const {
  registerUseCulmenAssetLayoutCommand,
} = require("./commands/useCulmenAssetLayout.js");
```

and add `registerUseCulmenAssetLayoutCommand(vscode),` to `context.subscriptions.push(...)`.

b) In `src/sidebar/registerSlabSidebar.js`, add a button to the action list, after the "Open Preview" button:

```html
        <button class="action" onclick="runCommand('slab.useCulmenAssetLayout')">
          <span>
            <span class="action-title">Culmen Asset Layout</span><br />
            <span class="action-note">Save pasted images to <code>assets/</code> next to the note.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
```

c) In `package.json` `contributes.commands`, add:

```json
      {
        "command": "slab.useCulmenAssetLayout",
        "title": "Slab: Use Culmen Asset Layout",
        "category": "Slab"
      }
```

d) Append to the `smoke` script: `&& node ./tests/smoke/culmen-asset-layout.mjs`

- [ ] **Step 6: Run the suite**

Run: `npm run smoke`
Expected: 8 scripts pass.

- [ ] **Step 7: Commit**

```bash
git add src/commands/useCulmenAssetLayout.js src/extension.js src/sidebar/registerSlabSidebar.js tests/smoke/culmen-asset-layout.mjs package.json
git commit -m "feat: one-click Culmen asset layout for pasted images"
```

---

## Task 8: README, CHANGELOG, AGENTS capsule, .vscodeignore

**Files:**
- Modify: `README.md` (full rewrite, content below)
- Modify: `CHANGELOG.md` (prepend 0.2.0 entry)
- Modify: `AGENTS.md` (project capsule)
- Modify: `.vscodeignore` (ensure docs/comms excluded)

- [ ] **Step 1: Rewrite README.md**

Replace the entire content with:

```markdown
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
```

- [ ] **Step 2: Prepend the CHANGELOG entry**

At the top of `CHANGELOG.md` (below the main heading if one exists, otherwise at the very top), add:

```markdown
## 0.2.0 — 2026-06-11

Re-scoped Slab to a markdown-only companion for Culmen study notes.

- Removed: the notebook pipeline (scaffold → `.ipynb`, review export, attachment extraction) and the `slab.preferNotebookMarkdown` setting.
- Renamed: `slab.notebookPreviewMode` → `slab.openPreview`.
- Added: theme presets now style the external popout preview as well as editor LaTeX colors.
- Added: pipe-table editing — Tab/Shift+Tab cell navigation with auto-alignment, format/insert/delete row and column commands.
- Added: image path completion from the note's `assets/` folder.
- Added: `Slab: Use Culmen Asset Layout` points `markdown.copyFiles.destination` at `assets/`.
```

- [ ] **Step 3: Update the AGENTS.md project capsule**

In `AGENTS.md` (NOT `CLAUDE.md` — that's a symlink):

a) Replace the **Identity** line with:

```markdown
- **Identity:** VS Code extension: lightweight markdown companion for Culmen study notes -- themed external browser preview, LaTeX-aware completions/highlighting, pipe-table editing helpers, asset-path completion, and Culmen-friendly image paste defaults. Defers standard rendering to VS Code native.
```

b) Replace the **Key files** line with:

```markdown
- **Key files:** `package.json` (manifest), `src/extension.js` (entrypoint), `src/preview/`, `src/sidebar/`, `src/editor/`, `src/commands/`.
```

- [ ] **Step 4: Ensure .vscodeignore excludes docs and comms**

Check `.vscodeignore`; if not already present, append these lines:

```
docs/**
comms/**
```

- [ ] **Step 5: Run the suite and commit**

Run: `npm run smoke`
Expected: 8 scripts pass.

```bash
git add README.md CHANGELOG.md AGENTS.md .vscodeignore
git commit -m "docs: rewrite README/CHANGELOG/capsule for the markdown companion"
```

---

## Task 9: Final verification, project log, push

**Files:**
- Modify: `PROJECT_LOG.md` (append Milestone entry, refresh Current state)

- [ ] **Step 1: Full smoke run**

Run: `npm run smoke`
Expected: all 8 scripts pass.

- [ ] **Step 2: Release gate**

Run: `npm run release:check`
Expected: `Release check passed for slab-notebooks.slab-vscode@0.2.0.` (this also runs `npm test` and packages the VSIX; requires `unzip` on PATH). If it fails on VSIX contents, fix `.vscodeignore` and re-run.

- [ ] **Step 3: Append a Milestone entry to PROJECT_LOG.md**

Append at the bottom (follow the existing entry format; use the actual date of execution as YYYY-MM-DD):

```markdown
## YYYY-MM-DD - Markdown companion re-scope shipped

Type: Milestone

The 2026-06-11 re-scope is implemented and verified: notebook pipeline deleted,
preview command renamed to `slab.openPreview`, theme presets now style the
popout preview, pipe-table editing helpers (Tab navigation, format, row/column
ops) added with a pure `tableModel.js` core, asset-path completion reads the
note's `assets/` folder, and `Slab: Use Culmen Asset Layout` points
`markdown.copyFiles.destination` at `assets/`. `npm run smoke` (8 scripts) and
`npm run release:check` pass at version 0.2.0.
```

Also update the `## Current state` block: set **Last updated** to today's date, and change **Next likely step** to revisiting Marketplace publishing (publisher + `VSCE_PAT`).

- [ ] **Step 4: Commit and push**

```bash
git add PROJECT_LOG.md
git commit -m "chore: log markdown companion milestone"
git push
```

(Per project rules: push after each substantial verified milestone. If the push fails for credential reasons, report it explicitly and stop.)

- [ ] **Step 5: Manual acceptance check (Extension Development Host)**

Press F5 and verify the full Culmen loop manually:
1. Open a Culmen-style note (`<Concept>/<Concept>.md` with an `assets/` folder).
2. `Slab: Open Preview` — themed popout opens in the browser, math renders, `assets/` images display.
3. Switch theme in the sidebar — editor tokens and the open popout both restyle within a second.
4. Tab through a pipe table — cells align, navigation works, Tab elsewhere behaves natively.
5. Type `![](` — asset completions appear.
6. Run `Slab: Use Culmen Asset Layout`, paste an image into the note — the file lands in `assets/` and the link is plain `![](assets/...)`.
```
