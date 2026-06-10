/**
 * Flatten a clean notebook JSON document into Culmen's review-markdown contract.
 *
 * Markdown cells are passed through as-authored after only normalizing the
 * nbformat array-or-string source shape into a single string. This preserves
 * internal newlines and does not trim, re-case, or rewrite markdown content.
 *
 * @param {object} notebookJson - parsed .ipynb JSON
 * @param {object} [options]
 * @returns {string}
 */
function flattenNotebook(notebookJson, options = {}) {
  const cells = Array.isArray(notebookJson?.cells) ? notebookJson.cells : [];
  const renderedBlocks = [];
  let seenSectionHeading = false;

  for (const cell of cells) {
    if (!cell || typeof cell !== "object") {
      continue;
    }

    if (cell.cell_type === "markdown") {
      const source = normalizeCellSource(cell.source);

      if (startsWithSectionHeading(source)) {
        if (seenSectionHeading) {
          renderedBlocks.push("---");
        }
        seenSectionHeading = true;
      }

      renderedBlocks.push(source === "" ? "\n" : source);
      continue;
    }

    if (cell.cell_type === "code") {
      const source = normalizeCellSource(cell.source);
      if (source.trim() === "") {
        continue;
      }

      renderedBlocks.push(renderCodeCell(cell, source, notebookJson, options));
    }
  }

  return ensureSingleTrailingNewline(joinBlocks(renderedBlocks));
}

function normalizeCellSource(source) {
  if (Array.isArray(source)) {
    return source.join("");
  }

  return typeof source === "string" ? source : "";
}

function startsWithSectionHeading(source) {
  const lines = normalizeCellSource(source).split("\n");

  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }

    return /^##(?!#)\s/.test(line.trimStart());
  }

  return false;
}

function renderCodeCell(cell, source, notebookJson, options) {
  const language = resolveCodeLanguage(cell, notebookJson, options);
  const fence = buildFence(source);
  const body = source.endsWith("\n") ? source : `${source}\n`;
  return `${fence}${language}\n${body}${fence}`;
}

function resolveCodeLanguage(cell, notebookJson, options) {
  const cellLanguage = cell?.metadata?.vscode?.languageId;
  if (typeof cellLanguage === "string" && cellLanguage.trim()) {
    return cellLanguage.trim();
  }

  const notebookLanguage = notebookJson?.metadata?.kernelspec?.language;
  if (typeof notebookLanguage === "string" && notebookLanguage.trim()) {
    return notebookLanguage.trim();
  }

  const fallbackLanguage = options.fallbackLanguage;
  if (typeof fallbackLanguage === "string" && fallbackLanguage.trim()) {
    return fallbackLanguage.trim();
  }

  return "text";
}

function buildFence(source) {
  const matches = normalizeCellSource(source).match(/`+/g) || [];
  const longestRun = matches.reduce(
    (maxLength, run) => Math.max(maxLength, run.length),
    0,
  );
  return "`".repeat(Math.max(3, longestRun + 1));
}

function joinBlocks(blocks) {
  let output = "";

  for (const block of blocks) {
    if (output === "") {
      output = block;
      continue;
    }

    const boundaryNewlines = countTrailingNewlines(output) + countLeadingNewlines(block);
    const insertedNewlines = boundaryNewlines >= 2 ? "" : "\n".repeat(2 - boundaryNewlines);
    output = `${output}${insertedNewlines}${block}`;
  }

  return output;
}

function countLeadingNewlines(value) {
  const match = String(value || "").match(/^\n+/);
  return match ? match[0].length : 0;
}

function countTrailingNewlines(value) {
  const match = String(value || "").match(/\n+$/);
  return match ? match[0].length : 0;
}

function ensureSingleTrailingNewline(value) {
  return String(value || "").replace(/\n*$/, "\n");
}

module.exports = {
  flattenNotebook,
};
