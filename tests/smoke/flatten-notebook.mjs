import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { flattenNotebook } = require("../../src/adapter/flatten-notebook.js");

const fixturePath = path.resolve("tests/smoke/fixtures/authored-notebook.ipynb");
const notebookJson = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const output = flattenNotebook(notebookJson);

if (!output.includes("# Authored Notebook Concept")) {
  throw new Error("Expected flattened markdown to include the title heading.");
}

if (!output.includes("```python\nresult = 2 + 2\nprint(result)\n```")) {
  throw new Error("Expected flattened markdown to include a standard fenced python block.");
}

if (!output.includes("````python")) {
  throw new Error("Expected flattened markdown to use a longer fence for code containing ```.");
}

if (!output.includes("![alt](./assets/paste-20260101-000000.png)")) {
  throw new Error("Expected flattened markdown to preserve relative asset references.");
}

if (output.includes("attachment:")) {
  throw new Error("Expected flattened markdown to exclude attachment: URIs.");
}

if (output.includes("rendered notebook output")) {
  throw new Error("Expected flattened markdown to exclude code cell outputs.");
}

if (!normalize(output).includes("\n---\n")) {
  throw new Error("Expected a section separator before the later H2 section.");
}

if (!output.endsWith("\n") || output.endsWith("\n\n")) {
  throw new Error("Expected flattened markdown to end with exactly one trailing newline.");
}

console.log("Smoke passed for notebook flattening.");

function normalize(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]*---[ \t]*\n/g, "\n---\n");
}
