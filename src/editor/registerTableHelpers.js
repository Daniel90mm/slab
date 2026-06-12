// Known v1 limitations: pipe lines inside fenced code blocks can still be
// detected as tables if they include a separator-like row, and column widths
// use UTF-16 code-unit lengths, so CJK/emoji cells may visually misalign.
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
} = require("./tableModel.js");

const IN_TABLE_CONTEXT = "slab.inTable";

function registerTableHelpers(vscode) {
  const updateContext = (editor = vscode.window.activeTextEditor) => {
    const document = editor?.document;
    const inTable = Boolean(
      document
      && document.languageId === "markdown"
      && editor.selection
      && isTableLine(document.lineAt(editor.selection.active.line).text),
    );
    void vscode.commands.executeCommand("setContext", IN_TABLE_CONTEXT, inTable);
  };

  const readLines = (document) => {
    const lines = [];
    for (let i = 0; i < document.lineCount; i += 1) {
      lines.push(document.lineAt(i).text);
    }
    return lines;
  };

  const withTable = (handler) => async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      return;
    }

    const lines = readLines(editor.document);
    const cursor = editor.selection.active;
    const table = parseTable(lines, cursor.line);

    if (!table) {
      vscode.window.setStatusBarMessage("Slab: the cursor is not inside a markdown table.", 2500);
      return;
    }

    await handler(editor, table, cursor, lines);
  };

  const replaceTable = async (editor, table, formattedLines) => {
    const lastLineLength = editor.document.lineAt(table.end).text.length;
    const range = new vscode.Range(table.start, 0, table.end, lastLineLength);
    return editor.edit((edit) => edit.replace(range, formattedLines.join("\n")));
  };

  const placeCursor = (editor, table, formattedLines, rowIndex, colIndex) => {
    const line = table.start + rowIndex;
    const character = cellStartCharacter(formattedLines[rowIndex], colIndex);
    editor.selection = new vscode.Selection(line, character, line, character);
  };

  const navigate = (delta) => withTable(async (editor, table, cursor, lines) => {
    const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
    const target = moveCell(table, cursor.line - table.start, colIndex, delta);
    const formatted = formatTable(table);
    const applied = await replaceTable(editor, table, formatted);

    if (applied && target) {
      placeCursor(editor, table, formatted, target.rowIndex, target.colIndex);
    }
  });

  updateContext();

  return vscode.Disposable.from(
    vscode.commands.registerCommand("slab.formatTable", withTable(async (editor, table) => {
      await replaceTable(editor, table, formatTable(table));
    })),
    vscode.commands.registerCommand("slab.tableNextCell", navigate(1)),
    vscode.commands.registerCommand("slab.tablePrevCell", navigate(-1)),
    vscode.commands.registerCommand(
      "slab.tableInsertRowBelow",
      withTable(async (editor, table, cursor) => {
        const updated = insertRowBelow(table, cursor.line - table.start);
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableDeleteRow",
      withTable(async (editor, table, cursor) => {
        const updated = deleteRow(table, cursor.line - table.start);
        if (!updated) {
          vscode.window.setStatusBarMessage("Slab: cannot delete the header or separator row.", 2500);
          return;
        }
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableInsertColumnRight",
      withTable(async (editor, table, cursor, lines) => {
        const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
        const updated = insertColumnRight(table, colIndex);
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.commands.registerCommand(
      "slab.tableDeleteColumn",
      withTable(async (editor, table, cursor, lines) => {
        const colIndex = Math.min(locateColumn(lines[cursor.line], cursor.character), table.columnCount - 1);
        const updated = deleteColumn(table, colIndex);
        if (!updated) {
          vscode.window.setStatusBarMessage("Slab: a table needs at least one column.", 2500);
          return;
        }
        await replaceTable(editor, table, formatTable(updated));
      }),
    ),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      updateContext(event.textEditor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      updateContext(editor);
    }),
  );
}

module.exports = {
  IN_TABLE_CONTEXT,
  registerTableHelpers,
};
