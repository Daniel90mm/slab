const { flattenNotebook } = require("./adapter/flatten-notebook.js");
const COMMAND_ID = "slab.notebookPreviewMode";
const CONTEXT_KEY = "slab.canEnablePreviewMode";
const {
  registerCreateNotebookFromScaffoldCommand,
} = require("./commands/createNotebookFromScaffold.js");
const {
  registerExportNotebookForReviewCommand,
} = require("./commands/exportNotebookForReview.js");
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

function resolveSlabSurface({
  languageId = "",
  notebookType = "",
  uriScheme = "",
} = {}) {
  const isMarkdown = languageId === "markdown";
  const isNotebook = Boolean(notebookType);
  const isNotebookMarkdown = isNotebook && isMarkdown;

  return {
    languageId,
    notebookType,
    uriScheme,
    isMarkdown,
    isNotebook,
    isNotebookMarkdown,
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
    notebookType: document.notebook?.notebookType ?? "",
    uriScheme: document.uri?.scheme ?? "",
  });
}

function buildStatusBarText(surface) {
  if (surface.isNotebookMarkdown) {
    return "Slab: Notebook";
  }

  if (surface.isMarkdown) {
    return "Slab: Markdown";
  }

  return "Slab";
}

function buildMessage(surface, preferNotebookMarkdown = true) {
  if (!surface.canEnablePreviewMode) {
    return "Open a markdown file or notebook to use Slab Preview.";
  }

  const target = surface.isNotebookMarkdown
    ? `a ${surface.notebookType} notebook`
    : "a markdown document";
  const recommendation = preferNotebookMarkdown && !surface.isNotebookMarkdown
    ? " Notebooks are the preferred surface for future Slab helpers."
    : "";

  return `Slab Preview opens a live compiled view for ${target} in your external browser window.${recommendation}`;
}

async function refreshStatusBar(vscode, statusBar, editor = vscode.window.activeTextEditor) {
  const surface = getEditorSurface(editor);
  const config = vscode.workspace.getConfiguration("slab");
  const showStatusBarEntry = config.get("showStatusBarEntry", true);
  const preferNotebookMarkdown = config.get("preferNotebookMarkdown", true);

  await vscode.commands.executeCommand("setContext", CONTEXT_KEY, surface.canEnablePreviewMode);

  if (!showStatusBarEntry || !surface.canEnablePreviewMode) {
    statusBar.hide();
    return;
  }

  statusBar.text = buildStatusBarText(surface);
  statusBar.tooltip = buildMessage(surface, preferNotebookMarkdown);
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
    registerCreateNotebookFromScaffoldCommand(vscode),
    registerExportNotebookForReviewCommand(vscode),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      void refresh(editor);
    }),
    vscode.window.onDidChangeActiveNotebookEditor(() => {
      void refresh(vscode.window.activeTextEditor);
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
  const target = resolvePreviewTarget(vscode.window.activeTextEditor, vscode.window.activeNotebookEditor);

  if (!target) {
    return null;
  }

  if (target.kind === "markdown") {
    const document = target.editor.document;
    const baseDir = document.uri?.scheme === "file"
      ? require("node:path").dirname(document.uri.fsPath)
      : null;

    return {
      label: document.uri?.scheme === "file"
        ? require("node:path").basename(document.uri.fsPath)
        : "Markdown",
      sourceLabel: "Markdown document",
      markdown: document.getText(),
      baseDir,
    };
  }

  return buildNotebookPreviewDocument(vscode, target.notebookEditor.notebook);
}

function resolvePreviewTarget(activeTextEditor, activeNotebookEditor) {
  const textDocument = activeTextEditor?.document;
  const isPlainMarkdownDocument = textDocument?.languageId === "markdown"
    && textDocument?.uri?.scheme !== "vscode-notebook-cell";

  if (isPlainMarkdownDocument) {
    return {
      kind: "markdown",
      editor: activeTextEditor,
    };
  }

  if (activeNotebookEditor?.notebook) {
    return {
      kind: "notebook",
      notebookEditor: activeNotebookEditor,
    };
  }

  if (textDocument?.languageId === "markdown") {
    return {
      kind: "markdown",
      editor: activeTextEditor,
    };
  }

  return null;
}

function buildNotebookPreviewDocument(vscode, notebook) {
  const cells = typeof notebook.getCells === "function" ? notebook.getCells() : [];
  const notebookJson = {
    metadata: {
      kernelspec: {
        language: resolveNotebookLanguage(cells),
      },
    },
    cells: cells.map((cell) => buildPreviewNotebookCell(vscode, cell)),
  };

  const baseDir = notebook.uri?.scheme === "file"
    ? require("node:path").dirname(notebook.uri.fsPath)
    : null;

  return {
    label: notebook.uri?.scheme === "file"
      ? require("node:path").basename(notebook.uri.fsPath)
      : "Notebook",
    sourceLabel: "Notebook",
    markdown: flattenNotebook(notebookJson),
    baseDir,
  };
}

function resolveNotebookLanguage(cells) {
  for (const cell of cells) {
    const language = cell?.document?.languageId;
    if (typeof language === "string" && language && language !== "markdown") {
      return language;
    }
  }

  return "text";
}

function buildPreviewNotebookCell(vscode, cell) {
  if (cell?.kind === vscode.NotebookCellKind.Markup) {
    return {
      cell_type: "markdown",
      source: resolveNotebookPreviewMarkdown(cell),
      metadata: cell?.metadata || {},
    };
  }

  return {
    cell_type: "code",
    source: cell?.document?.getText?.() || "",
    metadata: {
      ...cell?.metadata,
      vscode: {
        ...(cell?.metadata?.vscode || {}),
        languageId: cell?.document?.languageId || "text",
      },
    },
  };
}

function resolveNotebookPreviewMarkdown(cell) {
  const source = cell?.document?.getText?.() || "";
  const attachments = cell?.metadata?.attachments;
  if (!attachments || typeof attachments !== "object") {
    return source;
  }

  return source.replace(/\(attachment:([^)]+)\)/g, (match, fileName) => {
    const attachment = attachments[fileName];
    const dataUri = buildAttachmentDataUri(attachment);
    return dataUri ? `(${dataUri})` : match;
  });
}

function buildAttachmentDataUri(attachment) {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const entry = Object.entries(attachment)[0];
  if (!entry || typeof entry[0] !== "string" || typeof entry[1] !== "string") {
    return null;
  }

  const [mimeType, payload] = entry;
  return `data:${mimeType};base64,${payload}`;
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
