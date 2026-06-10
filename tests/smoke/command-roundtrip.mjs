import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createNotebookFromScaffold,
  buildNotebookPathFromScaffold,
} = require("../../src/commands/createNotebookFromScaffold.js");
const {
  exportNotebookForReview,
  buildReviewPathFromNotebook,
} = require("../../src/commands/exportNotebookForReview.js");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "slab-roundtrip-"));
const scaffoldPath = path.join(tempDir, "Roundtrip Concept.md");
const scaffoldMarkdown = [
  "# Roundtrip Concept",
  "",
  "Intro paragraph for the scaffold.",
  "",
  "## First Section",
  "",
  "Inline math like $x$ and an image ref.",
  "",
  "![alt](./assets/paste-20260101-000000.png)",
  "",
  "```python",
  "print('hello roundtrip')",
  "```",
  "",
].join("\n");

fs.writeFileSync(scaffoldPath, scaffoldMarkdown, "utf8");

await createNotebookFromScaffold(scaffoldPath);

const notebookPath = buildNotebookPathFromScaffold(scaffoldPath);
if (!fs.existsSync(notebookPath)) {
  throw new Error("Expected notebook file to be created from scaffold.");
}

const notebookJson = JSON.parse(fs.readFileSync(notebookPath, "utf8"));
const answerCell = notebookJson.cells.find((cell) => cell.cell_type === "markdown" && cell.source === "");
if (!answerCell) {
  throw new Error("Expected emitted notebook to include a blank markdown answer cell.");
}

answerCell.source = "Answer text added after notebook creation.\n";
fs.writeFileSync(notebookPath, `${JSON.stringify(notebookJson, null, 2)}\n`, "utf8");

await exportNotebookForReview(notebookPath);

const reviewPath = buildReviewPathFromNotebook(notebookPath);
if (!fs.existsSync(reviewPath)) {
  throw new Error("Expected review markdown file to be exported.");
}

const reviewMarkdown = fs.readFileSync(reviewPath, "utf8");
if (!reviewMarkdown.includes("# Roundtrip Concept")) {
  throw new Error("Expected review markdown to keep the title heading.");
}

if (!reviewMarkdown.includes("Answer text added after notebook creation.")) {
  throw new Error("Expected review markdown to include the notebook answer content.");
}

if (!reviewMarkdown.includes("```python\nprint('hello roundtrip')\n```")) {
  throw new Error("Expected review markdown to include the scaffold code block.");
}

console.log("Smoke passed for command-level md/ipynb roundtrip.");
