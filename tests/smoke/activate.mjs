import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const extension = require("../../src/extension.js");

const notebookSurface = extension.resolveSlabSurface({
  languageId: "markdown",
  notebookType: "jupyter-notebook",
  uriScheme: "vscode-notebook-cell",
});

if (!notebookSurface.isNotebookMarkdown) {
  throw new Error("Expected a Jupyter markdown cell to be detected as notebook markdown.");
}

if (!notebookSurface.canEnablePreviewMode) {
  throw new Error("Expected preview mode to be available for notebook markdown.");
}

const markdownSurface = extension.resolveSlabSurface({
  languageId: "markdown",
  uriScheme: "file",
});

if (extension.buildStatusBarText(notebookSurface) !== "Slab: Notebook") {
  throw new Error("Expected notebook markdown to use the notebook status bar label.");
}

const markdownMessage = extension.buildMessage(markdownSurface, true);
if (!markdownMessage.includes("external browser window")) {
  throw new Error("Expected plain markdown messaging to describe the external preview.");
}

if (!markdownMessage.includes("Notebooks are the preferred surface")) {
  throw new Error("Expected plain markdown messaging to still recommend notebooks.");
}

const unsupportedSurface = extension.resolveSlabSurface({
  languageId: "python",
  notebookType: "jupyter-notebook",
});

if (unsupportedSurface.canEnablePreviewMode) {
  throw new Error("Expected preview mode to stay off for non-markdown notebook cells.");
}

const unsupportedMessage = extension.buildMessage(unsupportedSurface, true);
if (!unsupportedMessage.includes("Open a markdown file or notebook")) {
  throw new Error("Expected unsupported-surface messaging to steer the user toward markdown or notebooks.");
}

const previewTarget = extension.resolvePreviewTarget(
  { document: { languageId: "markdown", uri: { scheme: "file" } } },
  { notebook: {} },
);

if (!previewTarget || previewTarget.kind !== "markdown") {
  throw new Error("Expected a plain markdown file to win over an inactive notebook editor for preview.");
}

console.log(`Smoke passed for ${extension.COMMAND_ID}`);
