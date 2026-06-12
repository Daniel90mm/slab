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
const {
  SLAB_THEME_PRESETS,
  resolvePopoutPalette,
} = require("./sidebar/slabThemes.js");
const {
  registerTableHelpers,
} = require("./editor/registerTableHelpers.js");
const {
  registerAssetCompletion,
} = require("./editor/registerAssetCompletion.js");

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
    registerTableHelpers(vscode),
    registerAssetCompletion(vscode),
    registerSlabSidebar(vscode, () => getEditorSurface(vscode.window.activeTextEditor)),
    registerExternalPreview(
      vscode,
      COMMAND_ID,
      () => buildPreviewDocument(vscode),
      () => resolvePopoutPalette(
        SLAB_THEME_PRESETS,
        vscode.workspace.getConfiguration("slab").get("activeTheme", "default"),
      ),
    ),
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
