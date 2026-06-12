/**
 * Pure pipe-table model for markdown editing helpers.
 *
 * Row indexes throughout are relative to the table block (0 = header).
 * The functions never touch lines outside the detected table block.
 */
const SEPARATOR_CELL_PATTERN = /^:?-+:?$/;

function isTableLine(line) {
  return String(line || "").trimStart().startsWith("|");
}

function findTableRange(lines, cursorLine) {
  if (cursorLine < 0 || cursorLine >= lines.length || !isTableLine(lines[cursorLine])) {
    return null;
  }

  let start = cursorLine;
  let end = cursorLine;
  while (start > 0 && isTableLine(lines[start - 1])) {
    start -= 1;
  }
  while (end + 1 < lines.length && isTableLine(lines[end + 1])) {
    end += 1;
  }

  return { start, end };
}

function splitRow(line) {
  const inner = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];
    if (char === "\\" && inner[i + 1] === "|") {
      current += "\\|";
      i += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_PATTERN.test(cell));
}

function parseTable(lines, cursorLine) {
  const range = findTableRange(lines, cursorLine);
  if (!range) {
    return null;
  }

  const rows = [];
  let separatorIndex = -1;

  for (let i = range.start; i <= range.end; i += 1) {
    const cells = splitRow(lines[i]);
    if (separatorIndex === -1 && rows.length === 1 && isSeparatorRow(cells)) {
      separatorIndex = rows.length;
    }
    rows.push(cells);
  }

  if (separatorIndex === -1) {
    return null;
  }

  const columnCount = Math.max(...rows.map((row) => row.length));

  return {
    start: range.start,
    end: range.end,
    rows,
    separatorIndex,
    columnCount,
    alignments: readAlignments(rows, separatorIndex, columnCount),
  };
}

function readAlignments(rows, separatorIndex, columnCount) {
  const alignments = new Array(columnCount).fill("none");
  if (separatorIndex === -1) {
    return alignments;
  }

  rows[separatorIndex].forEach((cell, index) => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    alignments[index] = left && right ? "center" : right ? "right" : left ? "left" : "none";
  });

  return alignments;
}

function formatTable(table) {
  const widths = new Array(table.columnCount).fill(3);

  table.rows.forEach((cells, rowIndex) => {
    if (rowIndex === table.separatorIndex) {
      return;
    }
    cells.forEach((cell, colIndex) => {
      widths[colIndex] = Math.max(widths[colIndex], cell.length);
    });
  });

  return table.rows.map((cells, rowIndex) => {
    if (rowIndex === table.separatorIndex) {
      const pieces = widths.map((width, colIndex) =>
        buildSeparatorCell(width, table.alignments[colIndex]));
      return `| ${pieces.join(" | ")} |`;
    }

    const padded = widths.map((width, colIndex) =>
      padCell(cells[colIndex] ?? "", width, table.alignments[colIndex]));
    return `| ${padded.join(" | ")} |`;
  });
}

function buildSeparatorCell(width, alignment) {
  if (alignment === "center") {
    return `:${"-".repeat(Math.max(width - 2, 1))}:`;
  }
  if (alignment === "right") {
    return `${"-".repeat(Math.max(width - 1, 1))}:`;
  }
  if (alignment === "left") {
    return `:${"-".repeat(Math.max(width - 1, 1))}`;
  }
  return "-".repeat(width);
}

function padCell(cell, width, alignment) {
  const gap = width - cell.length;
  if (gap <= 0) {
    return cell;
  }
  if (alignment === "right") {
    return " ".repeat(gap) + cell;
  }
  if (alignment === "center") {
    const leftPad = Math.floor(gap / 2);
    return " ".repeat(leftPad) + cell + " ".repeat(gap - leftPad);
  }
  return cell + " ".repeat(gap);
}

// May return columnCount (one past the last cell) when the cursor sits at the
// end of the line; callers must clamp to columnCount - 1.
function locateColumn(lineText, character) {
  const text = String(lineText || "");
  let pipes = 0;

  for (let i = 0; i < Math.min(character, text.length); i += 1) {
    if (text[i] === "|" && text[i - 1] !== "\\") {
      pipes += 1;
    }
  }

  return Math.max(pipes - 1, 0);
}

function cellStartCharacter(formattedLine, colIndex) {
  const text = String(formattedLine || "");
  let pipes = 0;

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "|" && text[i - 1] !== "\\") {
      if (pipes === colIndex) {
        return Math.min(i + 2, text.length);
      }
      pipes += 1;
    }
  }

  return text.length;
}

function moveCell(table, rowIndex, colIndex, delta) {
  const rows = table.rows.map((_, i) => i).filter((i) => i !== table.separatorIndex);
  const rowPosition = rows.indexOf(rowIndex);
  if (rowPosition === -1) {
    return null;
  }

  const flatIndex = rowPosition * table.columnCount + colIndex + delta;
  if (flatIndex < 0 || flatIndex >= rows.length * table.columnCount) {
    return null;
  }

  return {
    rowIndex: rows[Math.floor(flatIndex / table.columnCount)],
    colIndex: flatIndex % table.columnCount,
  };
}

function insertRowBelow(table, rowIndex) {
  const empty = new Array(table.columnCount).fill("");
  const minRow = table.separatorIndex === -1 ? 0 : table.separatorIndex;
  const insertAt = Math.max(rowIndex, minRow) + 1;
  const rows = [...table.rows];
  rows.splice(insertAt, 0, empty);
  return { ...table, rows };
}

function deleteRow(table, rowIndex) {
  if (rowIndex === 0 || rowIndex === table.separatorIndex) {
    return null;
  }
  return { ...table, rows: table.rows.filter((_, i) => i !== rowIndex) };
}

function insertColumnRight(table, colIndex) {
  const rows = table.rows.map((cells, rowIndex) => {
    const next = [...cells];
    while (next.length < table.columnCount) {
      next.push(rowIndex === table.separatorIndex ? "---" : "");
    }
    next.splice(colIndex + 1, 0, rowIndex === table.separatorIndex ? "---" : "");
    return next;
  });
  const alignments = [...table.alignments];
  alignments.splice(colIndex + 1, 0, "none");
  return { ...table, rows, alignments, columnCount: table.columnCount + 1 };
}

function deleteColumn(table, colIndex) {
  if (table.columnCount <= 1) {
    return null;
  }
  return {
    ...table,
    rows: table.rows.map((cells) => cells.filter((_, i) => i !== colIndex)),
    alignments: table.alignments.filter((_, i) => i !== colIndex),
    columnCount: table.columnCount - 1,
  };
}

module.exports = {
  isTableLine,
  findTableRange,
  parseTable,
  formatTable,
  locateColumn,
  cellStartCharacter,
  moveCell,
  insertRowBelow,
  deleteRow,
  insertColumnRight,
  deleteColumn,
};
