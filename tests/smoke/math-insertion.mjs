import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildMathInsertion } = require("../../src/editor/registerMathCommands.js");

const inline = buildMathInsertion("inline", "x + y");
if (inline.text !== "$x + y$") {
  throw new Error(`Expected inline math wrapping, got ${JSON.stringify(inline.text)}.`);
}

if (inline.selectionStart !== 1 || inline.selectionEnd !== 6) {
  throw new Error("Expected inline selection range to point at the wrapped expression.");
}

const display = buildMathInsertion("display");
if (display.text !== "$$\n\n$$") {
  throw new Error(`Expected empty display math block, got ${JSON.stringify(display.text)}.`);
}

if (display.selectionStart !== 3 || display.selectionEnd !== 3) {
  throw new Error("Expected display math cursor to land between delimiters.");
}

const equation = buildMathInsertion("equation", "E = mc^2");
if (!equation.text.includes("\\begin{equation}") || !equation.text.includes("\\end{equation}")) {
  throw new Error("Expected equation insertion to include equation environment delimiters.");
}

const align = buildMathInsertion("align", "a &= b");
if (!align.text.includes("\\begin{align}") || !align.text.includes("a &= b")) {
  throw new Error("Expected align insertion to preserve selected content.");
}

console.log("Smoke passed for Slab math insertion helpers.");
