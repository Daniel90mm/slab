const { SLAB_THEME_PRESETS } = require("./slabThemes.js");

class SlabSidebarProvider {
  constructor(vscode, getSurface) {
    this.vscode = vscode;
    this.getSurface = getSurface;
    this.view = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.onDidReceiveMessage((message) => {
      void this.handleMessage(message);
    });
    this.refresh();
  }

  refresh() {
    if (!this.view) {
      return;
    }

    const surface = this.getSurface();
    const config = this.vscode.workspace.getConfiguration("slab");
    this.view.webview.html = renderSidebarHtml(surface, {
      activeTheme: config.get("activeTheme", "default"),
      presets: SLAB_THEME_PRESETS,
    });
  }

  async handleMessage(message) {
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "runCommand" && typeof message.command === "string") {
      await this.vscode.commands.executeCommand(message.command);
      return;
    }

    if (message.type === "applyTheme" && typeof message.themeId === "string") {
      await applyThemePreset(this.vscode, message.themeId);
      this.refresh();
    }
  }
}

function registerSlabSidebar(vscode, getSurface) {
  const provider = new SlabSidebarProvider(vscode, getSurface);

  return vscode.Disposable.from(
    vscode.window.registerWebviewViewProvider("slab.sidebar", provider),
    vscode.window.onDidChangeActiveTextEditor(() => provider.refresh()),
  );
}

function renderSidebarHtml(surface = {}, options = {}) {
  const location = surface.isMarkdown ? "Markdown document" : "Non-markdown surface";
  const activeTheme = options.activeTheme || "default";
  const presets = options.presets || {};
  const support = surface.isMarkdown
    ? "Use the controls below to insert math, apply themes, and run the core Slab commands."
    : "Open a markdown file, then use the controls below.";
  const presetCards = Object.entries(presets)
    .map(([id, preset]) => renderPresetCard(id, preset, activeTheme === id))
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        margin: 0;
        padding: 12px 14px 18px;
        background: var(--vscode-sideBar-background);
      }
      .section {
        padding: 0;
        margin: 0 0 22px;
      }
      h2 {
        margin: 0 0 10px;
        font-size: 24px;
        line-height: 1;
        letter-spacing: -0.01em;
      }
      h3 {
        margin: 0 0 8px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }
      p {
        margin: 0 0 8px;
        line-height: 1.35;
      }
      code {
        font-family: var(--vscode-editor-font-family);
        background: var(--vscode-textCodeBlock-background);
        padding: 0 4px;
        border-radius: 2px;
      }
      .meta {
        display: grid;
        grid-template-columns: 76px 1fr;
        gap: 2px 12px;
        margin-top: 10px;
        font-size: 12px;
      }
      button {
        border: none;
        background: transparent;
        color: var(--vscode-foreground);
        padding: 0;
        cursor: pointer;
        text-align: left;
        font: inherit;
      }
      button:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: 2px;
      }
      .action-list,
      .theme-list {
        display: grid;
        gap: 14px;
      }
      .action {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        align-items: baseline;
        padding: 0;
      }
      .action-title {
        font-size: 17px;
        line-height: 1.05;
      }
      .action:hover .action-title,
      .theme-apply:hover {
        color: var(--vscode-terminal-ansiCyan);
      }
      .action-note {
        color: var(--vscode-descriptionForeground);
        font-size: 12px;
        line-height: 1.3;
      }
      .token-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        margin: 10px 0 2px;
        font-size: 12px;
      }
      .theme {
        padding: 0;
      }
      .theme-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
      }
      .theme-head strong {
        font-size: 18px;
        line-height: 1;
      }
      .theme-state {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--vscode-descriptionForeground);
      }
      .swatches {
        display: flex;
        gap: 6px;
        margin: 10px 0 8px;
      }
      .swatch {
        width: 14px;
        height: 14px;
        border-radius: 0;
        border: 1px solid rgba(255,255,255,0.18);
      }
      .theme-apply {
        color: var(--vscode-foreground);
        font-size: 13px;
        letter-spacing: 0.02em;
      }
      .muted {
        color: var(--vscode-descriptionForeground);
      }
    </style>
  </head>
  <body>
    <section class="section">
      <h2>Slab</h2>
      <p>${escapeHtml(support)}</p>
      <div class="meta">
        <div class="muted">Surface</div>
        <div>${escapeHtml(location)}</div>
        <div class="muted">Theme</div>
        <div>${escapeHtml(presets[activeTheme]?.label || activeTheme)}</div>
      </div>
    </section>
    <section class="section">
      <h3>Actions</h3>
      <div class="action-list">
        <button class="action" onclick="runCommand('slab.insertInlineMath')">
          <span>
            <span class="action-title">Inline Math</span><br />
            <span class="action-note">Wrap the selection in <code>$...$</code> or place the cursor between delimiters.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button class="action" onclick="runCommand('slab.insertDisplayMath')">
          <span>
            <span class="action-title">Display Math</span><br />
            <span class="action-note">Insert a centered <code>$$...$$</code> block for larger expressions.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button class="action" onclick="runCommand('slab.insertEquation')">
          <span>
            <span class="action-title">Equation</span><br />
            <span class="action-note">Insert a numbered LaTeX equation environment.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button class="action" onclick="runCommand('slab.insertAlign')">
          <span>
            <span class="action-title">Align</span><br />
            <span class="action-note">Insert an align environment for multi-line derivations.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <button class="action" onclick="runCommand('slab.openPreview')">
          <span>
            <span class="action-title">Open Preview</span><br />
            <span class="action-note">Open a live compiled preview in your external browser window.</span>
          </span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
    <section class="section">
      <h3>Themes</h3>
      <div class="token-grid">
        <div><code>\\begin</code>/<code>\\end</code></div>
        <div>environment names</div>
        <div>Greek letters</div>
        <div>general commands</div>
        <div>inline math</div>
        <div>block math</div>
      </div>
      <div class="theme-list">${presetCards}</div>
    </section>
    <script>
      const vscode = acquireVsCodeApi();
      function runCommand(command) {
        vscode.postMessage({ type: 'runCommand', command });
      }
      function applyTheme(themeId) {
        vscode.postMessage({ type: 'applyTheme', themeId });
      }
    </script>
  </body>
</html>`;
}

function renderPresetCard(id, preset, active) {
  const colors = preset.colors || {};
  const swatches = [
    colors.environmentKeyword,
    colors.environmentName,
    colors.greek,
    colors.command,
  ]
    .filter(Boolean)
    .map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`)
    .join("");

  return `<div class="theme">
    <div class="theme-head">
      <strong>${escapeHtml(preset.label)}</strong>
      <span class="theme-state">${active ? "active" : "preset"}</span>
    </div>
    <p>${escapeHtml(preset.description)}</p>
    <div class="swatches">${swatches}</div>
    <button class="theme-apply" onclick="applyTheme('${escapeHtml(id)}')">${active ? "Applied" : "Apply Theme"}</button>
  </div>`;
}

async function applyThemePreset(vscode, themeId) {
  const preset = SLAB_THEME_PRESETS[themeId];
  if (!preset) {
    return;
  }

  const config = vscode.workspace.getConfiguration("slab");
  await config.update("activeTheme", themeId, vscode.ConfigurationTarget.Global);

  for (const [key, value] of Object.entries(preset.colors)) {
    await config.update(`latexColors.${key}`, value, vscode.ConfigurationTarget.Global);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  registerSlabSidebar,
  renderSidebarHtml,
};
