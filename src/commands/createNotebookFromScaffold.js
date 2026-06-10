const fs = require("node:fs");
const path = require("node:path");

const { parseScaffold } = require("../adapter/parse-scaffold.js");
const { emitNotebook } = require("../adapter/emit-notebook.js");
const { writeFileAtomic } = require("../util/atomicWrite.js");

const COMMAND_ID = "slab.createNotebookFromScaffold";

function registerCreateNotebookFromScaffoldCommand(vscode) {
  return vscode.commands.registerCommand(COMMAND_ID, async (uri) => {
    try {
      const scaffoldPath = await resolveScaffoldPath(vscode, uri);
      if (!scaffoldPath) {
        return;
      }

      const result = await createNotebookFromScaffold(scaffoldPath);
      await vscode.window.showInformationMessage(
        `Created notebook ${path.basename(result.notebookPath)}.`,
      );
    } catch (error) {
      console.error("[slab.createNotebookFromScaffold]", error);
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showErrorMessage(message);
    }
  });
}

async function createNotebookFromScaffold(scaffoldPath, options = {}) {
  if (!scaffoldPath) {
    throw new Error("Choose a local scaffold markdown file first.");
  }

  const notebookPath = buildNotebookPathFromScaffold(scaffoldPath);
  await failIfTargetExists(notebookPath);

  let markdown;
  try {
    markdown = await fs.promises.readFile(scaffoldPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read scaffold ${path.basename(scaffoldPath)}.`);
  }

  const scaffoldTree = parseScaffold(markdown);
  if (!scaffoldTree.title) {
    throw new Error("Scaffold has no # Title - cannot create notebook.");
  }

  const notebookJson = emitNotebook(scaffoldTree, options);
  const notebookText = `${JSON.stringify(notebookJson, null, 2)}\n`;
  await writeFileAtomic(notebookPath, Buffer.from(notebookText, "utf8"));

  return {
    scaffoldPath,
    notebookPath,
  };
}

async function resolveScaffoldPath(vscode, uri) {
  if (uri?.scheme === "file") {
    return uri.fsPath;
  }

  const activePath = getActiveMarkdownPath(vscode.window.activeTextEditor);
  if (activePath) {
    return activePath;
  }

  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    filters: {
      Markdown: ["md", "markdown"],
    },
    openLabel: "Select Scaffold",
  });

  return selection?.[0]?.scheme === "file" ? selection[0].fsPath : "";
}

function getActiveMarkdownPath(editor) {
  const document = editor?.document;
  if (!document || document.uri?.scheme !== "file") {
    return "";
  }

  if (document.languageId === "markdown") {
    return document.uri.fsPath;
  }

  return "";
}

function buildNotebookPathFromScaffold(scaffoldPath) {
  const parsed = path.parse(scaffoldPath);
  const name = parsed.ext ? parsed.name : parsed.base;
  return path.join(parsed.dir, `${name}.ipynb`);
}

async function failIfTargetExists(targetPath) {
  try {
    await fs.promises.stat(targetPath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  throw new Error(`Target ${path.basename(targetPath)} already exists - delete or move it first.`);
}

module.exports = {
  COMMAND_ID,
  registerCreateNotebookFromScaffoldCommand,
  createNotebookFromScaffold,
  buildNotebookPathFromScaffold,
};
