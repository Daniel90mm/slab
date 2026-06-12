import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isTableLine,
  parseTable,
  formatTable,
  locateColumn,
  cellStartCharacter,
  moveCell,
  insertRowBelow,
  deleteRow,
  insertColumnRight,
  deleteColumn,
} = require("../../src/editor/tableModel.js");

const lines = [
  "Intro text",
  "| Name | Score |",
  "| --- | ---: |",
  "| Ada | 9 |",
  "| Grace Hopper | 10 |",
  "",
  "Outro",
];

if (isTableLine("Intro text")) {
  throw new Error("Expected plain text to not count as a table line.");
}

if (!isTableLine("  | a |")) {
  throw new Error("Expected an indented pipe row to count as a table line.");
}

if (parseTable(lines, 0) !== null) {
  throw new Error("Expected parseTable to return null outside a table.");
}

const table = parseTable(lines, 3);
if (!table || table.start !== 1 || table.end !== 4) {
  throw new Error(`Expected table range 1-4, got ${JSON.stringify(table && [table.start, table.end])}.`);
}

if (table.separatorIndex !== 1 || table.columnCount !== 2) {
  throw new Error("Expected separator at row 1 and two columns.");
}

if (table.alignments[0] !== "none" || table.alignments[1] !== "right") {
  throw new Error(`Expected alignments [none, right], got ${JSON.stringify(table.alignments)}.`);
}

const formatted = formatTable(table);
const expected = [
  "| Name         | Score |",
  "| ------------ | ----: |",
  "| Ada          |     9 |",
  "| Grace Hopper |    10 |",
];

if (JSON.stringify(formatted) !== JSON.stringify(expected)) {
  throw new Error(`Unexpected formatting:\n${formatted.join("\n")}`);
}

const centered = parseTable(["| h |", "| :-: |", "| x |"], 0);
if (centered.alignments[0] !== "center") {
  throw new Error("Expected :-: to parse as center alignment.");
}

if (formatTable(centered)[1] !== "| :-: |") {
  throw new Error(`Expected a centered separator, got ${formatTable(centered)[1]}.`);
}

const escaped = parseTable(["| a \\| b | c |", "| --- | --- |"], 0);
if (escaped.columnCount !== 2 || escaped.rows[0][0] !== "a \\| b") {
  throw new Error(`Expected escaped pipes to stay inside one cell, got ${JSON.stringify(escaped.rows[0])}.`);
}

if (locateColumn("| Ada | 9 |", 3) !== 0 || locateColumn("| Ada | 9 |", 8) !== 1) {
  throw new Error("Expected locateColumn to map characters to cell indexes.");
}

if (cellStartCharacter("| Ada          |     9 |", 0) !== 2) {
  throw new Error("Expected cell 0 to start at character 2.");
}

if (cellStartCharacter("| Ada          |     9 |", 1) !== 17) {
  throw new Error(`Expected cell 1 to start at character 17, got ${cellStartCharacter("| Ada          |     9 |", 1)}.`);
}

const next = moveCell(table, 0, 1, 1);
if (!next || next.rowIndex !== 2 || next.colIndex !== 0) {
  throw new Error(`Expected Tab from header Score to land on Ada, got ${JSON.stringify(next)}.`);
}

if (moveCell(table, 0, 0, -1) !== null) {
  throw new Error("Expected Shift+Tab from the first cell to return null.");
}

if (moveCell(table, 3, 1, 1) !== null) {
  throw new Error("Expected Tab from the last cell to return null.");
}

if (moveCell(table, 1, 0, 1) !== null) {
  throw new Error("Expected moveCell from the separator row to return null.");
}

const withRow = insertRowBelow(table, 0);
if (withRow.rows.length !== 5 || withRow.rows[2].join("") !== "") {
  throw new Error("Expected insertRowBelow from the header to insert an empty row after the separator.");
}

const withRowMid = insertRowBelow(table, 2);
if (withRowMid.rows[3].join("") !== "") {
  throw new Error("Expected insertRowBelow to insert after the cursor row.");
}

if (deleteRow(table, 0) !== null || deleteRow(table, 1) !== null) {
  throw new Error("Expected deleteRow to refuse the header and separator rows.");
}

const withoutRow = deleteRow(table, 2);
if (withoutRow.rows.length !== 3 || withoutRow.rows[2][0] !== "Grace Hopper") {
  throw new Error("Expected deleteRow to remove the body row.");
}

const widened = insertColumnRight(table, 0);
if (widened.columnCount !== 3 || widened.rows[0][1] !== "" || widened.alignments[1] !== "none") {
  throw new Error("Expected insertColumnRight to add an empty unaligned column.");
}

if (widened.rows[1][1] !== "---") {
  throw new Error("Expected the separator row to gain a dash cell.");
}

const narrowed = deleteColumn(table, 1);
if (narrowed.columnCount !== 1 || narrowed.rows[0].length !== 1) {
  throw new Error("Expected deleteColumn to drop the column.");
}

const single = parseTable(["| only |", "| --- |"], 0);
if (deleteColumn(single, 0) !== null) {
  throw new Error("Expected deleteColumn to refuse removing the last column.");
}

console.log("Smoke passed for table model.");
