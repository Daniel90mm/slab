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
