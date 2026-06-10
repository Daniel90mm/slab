import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { findBlockMathDelimiterOffsets } = require("../../src/editor/registerLatexSupport.js");

const sample = [
  "Before",
  "$$",
  "\\frac{a}{b}",
  "$$",
  "",
  "$$x + y$$",
  "After",
].join("\n");

const offsets = findBlockMathDelimiterOffsets(sample);
const highlighted = offsets.map(([start, end]) => sample.slice(start, end));

if (offsets.length !== 4) {
  throw new Error(`Expected 4 delimiter ranges, received ${offsets.length}.`);
}

if (!highlighted.every((segment) => segment === "$$")) {
  throw new Error(`Expected only $$ delimiters to be highlighted, got ${JSON.stringify(highlighted)}.`);
}

if (offsets.some(([start, end]) => sample.slice(start, end).includes("\\frac"))) {
  throw new Error("Expected block math contents to stay unhighlighted.");
}

console.log("Smoke passed for block-math delimiter highlighting.");
