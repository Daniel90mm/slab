import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parseScaffold } = require("../../src/adapter/parse-scaffold.js");
const { emitNotebook } = require("../../src/adapter/emit-notebook.js");

// Use the real Culmen scaffold shape so the parser is exercised on actual notes,
// then append one fenced-code section in-memory to cover code-block parsing too.
const scaffoldPath = "/home/daniel/Desktop/Mig/Culmen koncepter/Bayesian Learning and Priors/Bayesian Learning and Priors.md";
const scaffoldMarkdown = `${fs.readFileSync(scaffoldPath, "utf8").replace(/\n*$/, "\n\n")}## Notebook Code Exercise\n\n\`\`\`python\nprint(\"posterior\")\n\`\`\`\n`;

const scaffoldTree = parseScaffold(scaffoldMarkdown);
const notebook = emitNotebook(scaffoldTree);

if (scaffoldTree.title !== "Bayesian Learning and Priors") {
  throw new Error(`Unexpected scaffold title: ${scaffoldTree.title}`);
}

if (scaffoldTree.sections.length < 2) {
  throw new Error(`Expected multiple sections, got ${scaffoldTree.sections.length}.`);
}

if (notebook.nbformat !== 4 || notebook.nbformat_minor !== 5) {
  throw new Error(`Unexpected nbformat version: ${notebook.nbformat}.${notebook.nbformat_minor}`);
}

if (notebook.metadata?.kernelspec?.language !== "python") {
  throw new Error("Expected emitted notebook kernelspec.language to be python.");
}

if (notebook.metadata?.language_info?.name !== "python") {
  throw new Error("Expected emitted notebook language_info.name to be python.");
}

if (notebook.cells[0]?.cell_type !== "markdown" || !String(notebook.cells[0].source).includes("# Bayesian Learning and Priors")) {
  throw new Error("Expected first notebook cell to be the title markdown cell.");
}

const blankAnswerCells = notebook.cells.filter((cell) => cell.cell_type === "markdown" && cell.source === "");
if (blankAnswerCells.length !== scaffoldTree.sections.length) {
  throw new Error(
    `Expected one blank markdown answer cell per section, got ${blankAnswerCells.length} for ${scaffoldTree.sections.length} sections.`,
  );
}

const codeCell = notebook.cells.find((cell) => cell.cell_type === "code" && String(cell.source).includes('print("posterior")'));
if (!codeCell) {
  throw new Error("Expected emitted notebook to include a code cell from the fenced scaffold block.");
}

const cellIds = notebook.cells.map((cell) => cell.id);
if (cellIds.some((value) => typeof value !== "string" || !value.trim())) {
  throw new Error("Expected every emitted notebook cell to have a non-empty id.");
}

if (new Set(cellIds).size !== cellIds.length) {
  throw new Error("Expected emitted notebook cell ids to be unique.");
}

if (notebook.cells.some((cell) => "culmenSectionId" in (cell.metadata || {}) || "culmenRole" in (cell.metadata || {}))) {
  throw new Error("Expected emitted notebook cells to avoid Culmen-specific metadata.");
}

console.log("Smoke passed for scaffold parsing and notebook emission.");
