const fs = require("node:fs");
const path = require("node:path");

const { extractAttachments } = require("../attachments/extract.js");

const COMMAND_ID = "slab.extractAttachments";
const DIRTY_NOTEBOOK_MESSAGE = "Save the notebook before extracting attachments";

function registerExtractAttachmentsCommand(vscode) {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const editor = vscode.window.activeNotebookEditor;
    const notebook = editor?.notebook;

    if (!notebook) {
      await vscode.window.showInformationMessage(
        "Open a saved notebook before extracting attachments.",
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
        "Only saved local notebook files can be processed.",
      );
      return;
    }

    try {
      const result = await extractNotebookAttachments(uri.fsPath);

      if (result.assets.length === 0) {
        await vscode.window.showInformationMessage("No inline notebook attachments found.");
        return;
      }

      const label = result.assets.length === 1 ? "attachment" : "attachments";
      await vscode.window.showInformationMessage(
        `Extracted ${result.assets.length} ${label} to ./assets.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[slab.extractAttachments]", error);
      await vscode.window.showErrorMessage(`Failed to extract notebook attachments: ${message}`);
    }
  });
}

async function extractNotebookAttachments(notebookPath, options = {}) {
  const originalBytes = await fs.promises.readFile(notebookPath);
  const originalText = originalBytes.toString("utf8");
  const assetsDirectory = path.join(path.dirname(notebookPath), "assets");
  const takenAssetPaths = await listTakenAssetPaths(assetsDirectory);
  const { nextJson, assets } = extractAttachments(originalBytes, {
    now: options.now,
    takenAssetPaths,
  });

  if (assets.length === 0) {
    return {
      notebookPath,
      assets,
    };
  }

  const createdAssetPaths = [];

  try {
    await fs.promises.mkdir(assetsDirectory, { recursive: true });

    for (const asset of assets) {
      const targetPath = resolveAssetTargetPath(notebookPath, asset.path);
      await writeFileAtomic(targetPath, asset.bytes);
      createdAssetPaths.push(targetPath);
    }

    const notebookBytes = Buffer.from(
      serializeNotebook(nextJson, {
        originalText,
      }),
      "utf8",
    );
    await writeFileAtomic(notebookPath, notebookBytes);

    return {
      notebookPath,
      assets,
    };
  } catch (error) {
    await rollbackCreatedFiles(createdAssetPaths);
    throw error;
  }
}

async function listTakenAssetPaths(assetsDirectory) {
  try {
    const entries = await fs.promises.readdir(assetsDirectory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => `./assets/${entry.name}`);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function resolveAssetTargetPath(notebookPath, assetPath) {
  if (!assetPath.startsWith("./assets/")) {
    throw new Error(`Refusing to write unexpected asset path: ${assetPath}`);
  }

  const relativePath = assetPath.replace(/^\.\//, "");
  return path.join(path.dirname(notebookPath), ...relativePath.split("/"));
}

function serializeNotebook(notebookJson, { originalText }) {
  const indentation = detectIndentation(originalText);
  const trailingNewline = originalText.endsWith("\n");
  const serialized = JSON.stringify(notebookJson, null, indentation);
  return trailingNewline ? `${serialized}\n` : serialized;
}

function detectIndentation(text) {
  const match = text.match(/\n([ \t]+)"/);
  return match ? match[1] : 1;
}

async function writeFileAtomic(targetPath, bytes) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;

  try {
    await fs.promises.writeFile(tmpPath, bytes);
    await fs.promises.rename(tmpPath, targetPath);
  } finally {
    await removeFileIfPresent(tmpPath);
  }
}

async function rollbackCreatedFiles(filePaths) {
  for (const filePath of [...filePaths].reverse()) {
    await removeFileIfPresent(filePath);
  }
}

async function removeFileIfPresent(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
}

module.exports = {
  COMMAND_ID,
  DIRTY_NOTEBOOK_MESSAGE,
  registerExtractAttachmentsCommand,
  extractNotebookAttachments,
  serializeNotebook,
  writeFileAtomic,
};
