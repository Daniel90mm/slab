/**
 * Parse Culmen's scaffold markdown contract into a notebook-oriented tree.
 *
 * The scanner is intentionally small and only assigns structure for the first
 * top-level H1 title, top-level H2 sections, and fenced code blocks outside
 * existing fences. All other markdown is preserved verbatim inside markdown
 * blocks so a later emitter can round-trip the author's content cleanly.
 *
 * @param {string} markdown
 * @returns {{ title: string, leadBlocks: Array<object>, sections: Array<object> }}
 */
function parseScaffold(markdown) {
  const input = normalizeInput(markdown);
  const lines = splitLinesWithEndings(input);
  const tree = {
    title: "",
    leadBlocks: [],
    sections: [],
  };

  let currentSection = null;
  let markdownBuffer = [];
  let activeFence = null;
  let codeBuffer = [];

  for (const line of lines) {
    if (activeFence) {
      if (isClosingFence(line, activeFence)) {
        pushCodeBlock(getActiveContainer(tree, currentSection), {
          kind: "code",
          language: activeFence.language,
          content: codeBuffer.join(""),
        });
        activeFence = null;
        codeBuffer = [];
      } else {
        codeBuffer.push(line);
      }
      continue;
    }

    const openingFence = parseOpeningFence(line);
    if (openingFence) {
      flushMarkdownBuffer(tree, currentSection, markdownBuffer);
      markdownBuffer = [];
      activeFence = openingFence;
      codeBuffer = [];
      continue;
    }

    const h1 = parseHeading(line, 1);
    if (h1 && !tree.title && !currentSection && !hasNonWhitespace(markdownBuffer)) {
      tree.title = h1;
      markdownBuffer = [];
      continue;
    }

    const h2 = parseHeading(line, 2);
    if (h2) {
      flushMarkdownBuffer(tree, currentSection, markdownBuffer);
      markdownBuffer = [];
      currentSection = {
        heading: h2,
        blocks: [],
      };
      tree.sections.push(currentSection);
      continue;
    }

    markdownBuffer.push(line);
  }

  if (activeFence) {
    pushCodeBlock(getActiveContainer(tree, currentSection), {
      kind: "code",
      language: activeFence.language,
      content: codeBuffer.join(""),
    });
  } else {
    flushMarkdownBuffer(tree, currentSection, markdownBuffer);
  }

  return tree;
}

function normalizeInput(markdown) {
  return String(markdown || "").replace(/\r\n/g, "\n");
}

function splitLinesWithEndings(markdown) {
  return markdown.match(/[^\n]*\n|[^\n]+/g) || [];
}

function parseHeading(line, level) {
  const normalizedLine = stripTrailingLineEnding(line);
  const pattern = level === 1
    ? /^\s*#(?!#)\s+(.*?)(?:\s+#+\s*)?$/
    : /^\s*##(?!#)\s+(.*?)(?:\s+#+\s*)?$/;
  const match = normalizedLine.match(pattern);
  return match ? match[1].trim() : "";
}

function parseOpeningFence(line) {
  const match = stripTrailingLineEnding(line).match(/^\s*([`~]{3,})(.*)$/);
  if (!match) {
    return null;
  }

  const marker = match[1];
  const info = match[2].trim();
  const language = info ? info.split(/\s+/)[0] : "";

  return {
    character: marker[0],
    length: marker.length,
    language,
  };
}

function isClosingFence(line, fence) {
  const pattern = new RegExp(`^\\s*${escapeForRegExp(fence.character)}{${fence.length},}\\s*$`);
  return pattern.test(stripTrailingLineEnding(line));
}

function flushMarkdownBuffer(tree, currentSection, markdownBuffer) {
  const content = markdownBuffer.join("");
  if (content === "") {
    return;
  }

  getActiveContainer(tree, currentSection).push({
    kind: "markdown",
    content,
  });
}

function pushCodeBlock(container, block) {
  if (String(block.content || "").trim() === "") {
    return;
  }

  container.push(block);
}

function getActiveContainer(tree, currentSection) {
  return currentSection ? currentSection.blocks : tree.leadBlocks;
}

function hasNonWhitespace(lines) {
  return lines.some((line) => String(line || "").trim() !== "");
}

function escapeForRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTrailingLineEnding(line) {
  return String(line || "").replace(/\n$/, "");
}

module.exports = {
  parseScaffold,
};
