const fs = require("node:fs");
const path = require("node:path");

const { flattenNotebook } = require("../adapter/flatten-notebook.js");
const { extractNotebookAttachments } = require("./extractAttachments.js");
const { writeFileAtomic } = require("../util/atomicWrite.js");

const COMMAND_ID = "slab.exportNotebookForReview";
const DIRTY_NOTEBOOK_MESSAGE = "Notebook is unsaved - save before exporting review.";

function registerExportNotebookForReviewCommand(vscode) {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const editor = vscode.window.activeNotebookEditor;
    const notebook = editor?.notebook;

    if (!notebook) {
      await vscode.window.showInformationMessage(
        "Open a saved notebook before exporting review.",
      );
      return;
    }

    if (notebook.isDirty) {
      await vscode.window.showInformationMessage(DIRTY_NOTEBOOK_MESSAGE);
      return;
    }

    const uri = notebook.uri;
    if (!uri || uri.scheme !== "file") {
      await vscode.window.showInformationMessage(
        "Only saved local notebook files can be exported.",
      );
      return;
    }

    try {
      const result = await exportNotebookForReview(uri.fsPath);
      const attachmentNote = result.extractedAttachments > 0
        ? ` and extracted ${result.extractedAttachments} attachment${result.extractedAttachments === 1 ? "" : "s"}`
        : "";
      await vscode.window.showInformationMessage(
        `Exported review markdown to ${path.basename(result.reviewPath)}${attachmentNote}.`,
      );
    } catch (error) {
      console.error("[slab.exportNotebookForReview]", error);
      const message = error instanceof Error ? error.message : String(error);
      await vscode.window.showErrorMessage(message);
    }
  });
}

async function exportNotebookForReview(notebookPath, options = {}) {
  const extractionResult = await extractNotebookAttachments(notebookPath, options);

  let notebookText;
  try {
    notebookText = await fs.promises.readFile(notebookPath, "utf8");
  } catch (error) {
    throw new Error(`Could not read notebook ${path.basename(notebookPath)}.`);
  }

  let notebookJson;
  try {
    notebookJson = JSON.parse(notebookText);
  } catch (error) {
    throw new Error(`Notebook ${path.basename(notebookPath)} is not valid JSON - cannot export review.`);
  }

  const reviewMarkdown = flattenNotebook(notebookJson, options);
  const reviewPath = buildReviewPathFromNotebook(notebookPath);
  await writeFileAtomic(reviewPath, Buffer.from(reviewMarkdown, "utf8"));

  return {
    notebookPath,
    reviewPath,
    extractedAttachments: extractionResult.assets.length,
  };
}

function buildReviewPathFromNotebook(notebookPath) {
  const parsed = path.parse(notebookPath);
  const name = parsed.ext === ".ipynb" ? parsed.name : parsed.base;
  return path.join(parsed.dir, `${name}-review.md`);
}

module.exports = {
  COMMAND_ID,
  DIRTY_NOTEBOOK_MESSAGE,
  registerExportNotebookForReviewCommand,
  exportNotebookForReview,
  buildReviewPathFromNotebook,
};
