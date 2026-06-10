const crypto = require("node:crypto");

/**
 * Emit a minimal nbformat 4.5 notebook from a parsed scaffold tree.
 *
 * @param {{ title: string, leadBlocks: Array<object>, sections: Array<object> }} scaffoldTree
 * @param {{ kernelLanguage?: string, nbformat?: number, nbformatMinor?: number }} [options]
 * @returns {object}
 */
function emitNotebook(scaffoldTree, options = {}) {
  const title = String(scaffoldTree?.title || "").trim();
  if (!title) {
    throw new Error("Scaffold tree is missing a title.");
  }

  const kernelLanguage = normalizeKernelLanguage(options.kernelLanguage);
  const notebook = {
    cells: [],
    metadata: {
      kernelspec: {
        display_name: buildKernelDisplayName(kernelLanguage),
        language: kernelLanguage,
        name: buildKernelName(kernelLanguage),
      },
      language_info: {
        name: kernelLanguage,
      },
    },
    nbformat: Number.isInteger(options.nbformat) ? options.nbformat : 4,
    nbformat_minor: Number.isInteger(options.nbformatMinor) ? options.nbformatMinor : 5,
  };

  notebook.cells.push(createMarkdownCell(`# ${title}\n`));

  for (const block of normalizeBlocks(scaffoldTree?.leadBlocks)) {
    const cell = emitBlockCell(block, kernelLanguage);
    if (cell) {
      notebook.cells.push(cell);
    }
  }

  for (const section of normalizeSections(scaffoldTree?.sections)) {
    notebook.cells.push(...emitSectionCells(section, kernelLanguage));
  }

  return notebook;
}

function emitSectionCells(section, kernelLanguage) {
  const cells = [];
  const blocks = normalizeBlocks(section.blocks);
  let headingEmitted = false;

  if (blocks.length === 0) {
    cells.push(createMarkdownCell(buildSectionMarkdown(section.heading, "")));
    cells.push(createMarkdownCell(""));
    return cells;
  }

  for (const block of blocks) {
    if (block.kind === "markdown") {
      if (!headingEmitted) {
        cells.push(createMarkdownCell(buildSectionMarkdown(section.heading, block.content)));
        headingEmitted = true;
      } else {
        cells.push(createMarkdownCell(block.content));
      }
      continue;
    }

    if (block.kind === "code") {
      if (!headingEmitted) {
        cells.push(createMarkdownCell(buildSectionMarkdown(section.heading, "")));
        headingEmitted = true;
      }

      const codeCell = createCodeCell(block.content, block.language || kernelLanguage);
      if (codeCell) {
        cells.push(codeCell);
      }
    }
  }

  if (!headingEmitted) {
    cells.push(createMarkdownCell(buildSectionMarkdown(section.heading, "")));
  }

  cells.push(createMarkdownCell(""));
  return cells;
}

function emitBlockCell(block, kernelLanguage) {
  if (block.kind === "markdown") {
    return createMarkdownCell(block.content);
  }

  if (block.kind === "code") {
    return createCodeCell(block.content, block.language || kernelLanguage);
  }

  return null;
}

function createMarkdownCell(source) {
  return {
    cell_type: "markdown",
    id: crypto.randomUUID(),
    metadata: {},
    source: normalizeSource(source),
  };
}

function createCodeCell(source, language) {
  const normalized = normalizeSource(source);
  if (normalized.trim() === "") {
    return null;
  }

  return {
    cell_type: "code",
    execution_count: null,
    id: crypto.randomUUID(),
    metadata: {
      vscode: {
        languageId: normalizeKernelLanguage(language),
      },
    },
    outputs: [],
    source: normalized,
  };
}

function buildSectionMarkdown(heading, content) {
  const normalizedHeading = String(heading || "").trim();
  const normalizedContent = normalizeSource(content);

  if (!normalizedContent) {
    return `## ${normalizedHeading}\n`;
  }

  const separator = normalizedContent.startsWith("\n") ? "" : "\n";
  return ensureTrailingNewline(`## ${normalizedHeading}${separator}${normalizedContent}`);
}

function normalizeBlocks(blocks) {
  return Array.isArray(blocks) ? blocks.filter(Boolean) : [];
}

function normalizeSections(sections) {
  return Array.isArray(sections) ? sections.filter(Boolean) : [];
}

function normalizeSource(source) {
  return String(source || "").replace(/\r\n/g, "\n");
}

function ensureTrailingNewline(value) {
  return String(value || "").endsWith("\n") ? String(value || "") : `${value}\n`;
}

function normalizeKernelLanguage(language) {
  const normalized = String(language || "python").trim();
  return normalized || "python";
}

function buildKernelName(language) {
  return language === "python" ? "python3" : language;
}

function buildKernelDisplayName(language) {
  return language === "python" ? "Python 3" : language;
}

module.exports = {
  emitNotebook,
};
