const COMMANDS = {
  insertInlineMath: "slab.insertInlineMath",
  insertDisplayMath: "slab.insertDisplayMath",
  insertEquation: "slab.insertEquation",
  insertAlign: "slab.insertAlign",
};

const KIND_BY_COMMAND = {
  [COMMANDS.insertInlineMath]: "inline",
  [COMMANDS.insertDisplayMath]: "display",
  [COMMANDS.insertEquation]: "equation",
  [COMMANDS.insertAlign]: "align",
};

function registerMathCommands(vscode) {
  return vscode.Disposable.from(
    ...Object.entries(KIND_BY_COMMAND).map(([commandId, kind]) =>
      vscode.commands.registerCommand(commandId, async () => {
        await insertMathTemplate(vscode, kind);
      }),
    ),
  );
}

async function insertMathTemplate(vscode, kind) {
  const editor = vscode.window.activeTextEditor;
  if (!isMarkdownEditor(editor)) {
    await vscode.window.showInformationMessage(
      "Open a markdown file or notebook markdown cell before inserting Slab math.",
    );
    return;
  }

  const selections = editor.selections.length > 0
    ? editor.selections
    : [new vscode.Selection(editor.selection.active, editor.selection.active)];

  const replacements = selections
    .map((selection) => {
      const selectedText = editor.document.getText(selection);
      return {
        range: selection,
        startOffset: editor.document.offsetAt(selection.start),
        removedLength: selectedText.length,
        insertion: buildMathInsertion(kind, selectedText),
      };
    })
    .sort((a, b) => a.startOffset - b.startOffset);

  const applied = await editor.edit((editBuilder) => {
    for (const replacement of replacements) {
      editBuilder.replace(replacement.range, replacement.insertion.text);
    }
  });

  if (!applied) {
    return;
  }

  let deltaBefore = 0;
  const nextSelections = replacements.map((replacement) => {
    const anchorOffset = replacement.startOffset
      + deltaBefore
      + replacement.insertion.selectionStart;
    const activeOffset = replacement.startOffset
      + deltaBefore
      + replacement.insertion.selectionEnd;

    deltaBefore += replacement.insertion.text.length - replacement.removedLength;

    return new vscode.Selection(
      editor.document.positionAt(anchorOffset),
      editor.document.positionAt(activeOffset),
    );
  });

  editor.selections = nextSelections;
}

function isMarkdownEditor(editor) {
  return editor?.document?.languageId === "markdown";
}

function buildMathInsertion(kind, selectedText = "") {
  switch (kind) {
    case "inline":
      return wrapSelection("$", "$", selectedText);
    case "display":
      return wrapSelection("$$\n", "\n$$", selectedText);
    case "equation":
      return wrapSelection("\\begin{equation}\n\t", "\n\\end{equation}", selectedText);
    case "align":
      return wrapSelection("\\begin{align}\n\t", "\n\\end{align}", selectedText);
    default:
      throw new Error(`Unknown Slab math insertion kind: ${kind}`);
  }
}

function wrapSelection(prefix, suffix, selectedText) {
  const text = `${prefix}${selectedText}${suffix}`;
  const selectionStart = prefix.length;
  const selectionEnd = prefix.length + selectedText.length;

  return {
    text,
    selectionStart,
    selectionEnd,
  };
}

module.exports = {
  COMMANDS,
  KIND_BY_COMMAND,
  buildMathInsertion,
  registerMathCommands,
};
