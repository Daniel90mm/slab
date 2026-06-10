const DOCUMENT_SELECTOR = [
  { language: "markdown", scheme: "file" },
  { language: "markdown", scheme: "untitled" },
  { language: "markdown", scheme: "vscode-notebook-cell" },
];
const GREEK_LETTERS = [
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta",
  "theta", "vartheta", "iota", "kappa", "lambda", "mu", "nu", "xi", "pi",
  "rho", "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Phi", "Psi", "Omega",
];
const GREEK_PATTERN = new RegExp(`\\\\(?:${GREEK_LETTERS.join("|")})\\b`, "g");
const GENERAL_COMMAND_PATTERN = new RegExp(
  `\\\\(?!begin\\b|end\\b|(?:${GREEK_LETTERS.join("|")})\\b)[A-Za-z]+`,
  "g",
);
const ENVIRONMENT_KEYWORD_PATTERN = /\\(?:begin|end)\b/g;
const ENVIRONMENT_NAME_PATTERN = /(?<=\\(?:begin|end)\{)[A-Za-z*]+(?=\})/g;
const ENVIRONMENT_SNIPPETS = [
  ["\\begin{equation}", "equation environment", "\\begin{equation}\n\t$1\n\\end{equation}"],
  ["\\begin{align}", "align environment", "\\begin{align}\n\t$1 &= $2\n\\end{align}"],
  ["\\begin{gather}", "gather environment", "\\begin{gather}\n\t$1\n\\end{gather}"],
  ["\\begin{multline}", "multline environment", "\\begin{multline}\n\t$1\n\\end{multline}"],
  ["\\begin{cases}", "cases environment", "\\begin{cases}\n\t$1, & $2 \\\\\n\t$3, & $4\n\\end{cases}"],
  ["\\begin{bmatrix}", "bmatrix environment", "\\begin{bmatrix}\n\t$1\n\\end{bmatrix}"],
  ["\\begin{pmatrix}", "pmatrix environment", "\\begin{pmatrix}\n\t$1\n\\end{pmatrix}"],
  ["\\begin{aligned}", "aligned environment", "\\begin{aligned}\n\t$1 &= $2\n\\end{aligned}"],
];
const FUNCTION_SNIPPETS = [
  ["\\frac", "fraction", "\\frac{$1}{$2}"],
  ["\\sqrt", "square root", "\\sqrt{$1}"],
  ["\\sqrt[n]", "indexed root", "\\sqrt[${1:n}]{$2}"],
  ["\\sum", "sum", "\\sum_{${1:i}=1}^{${2:n}} $3"],
  ["\\prod", "product", "\\prod_{${1:i}=1}^{${2:n}} $3"],
  ["\\int", "integral", "\\int_{${1:a}}^{${2:b}} $3 \\, d$4"],
  ["\\lim", "limit", "\\lim_{${1:n}\\to ${2:\\infty}} $3"],
  ["\\mathbb", "blackboard bold", "\\mathbb{$1}"],
  ["\\mathbf", "bold math", "\\mathbf{$1}"],
  ["\\mathcal", "calligraphic math", "\\mathcal{$1}"],
  ["\\mathrm", "roman math text", "\\mathrm{$1}"],
  ["\\text", "text inside math", "\\text{$1}"],
];
const SYMBOL_COMMANDS = [
  "\\partial", "\\nabla", "\\cdot", "\\times", "\\div", "\\pm", "\\mp",
  "\\leq", "\\geq", "\\neq", "\\approx", "\\equiv", "\\propto",
  "\\infty", "\\to", "\\mapsto", "\\rightarrow", "\\leftarrow",
  "\\Rightarrow", "\\Leftarrow", "\\iff", "\\forall", "\\exists",
  "\\in", "\\notin", "\\subset", "\\subseteq", "\\cup", "\\cap",
  "\\emptyset", "\\varnothing", "\\ldots", "\\cdots",
];

function registerLatexSupport(vscode) {
  const state = {
    decorations: null,
  };

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    DOCUMENT_SELECTOR,
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        if (!/[\\$][^\\$]*$/.test(linePrefix)) {
          return [];
        }

        const replaceRange = position.character > 0 && linePrefix.endsWith("\\")
          ? new vscode.Range(position.translate(0, -1), position)
          : undefined;

        return buildLatexCompletions(vscode, replaceRange);
      },
    },
    "\\",
  );

  const rebuildDecorations = () => {
    disposeDecorations(state.decorations);
    state.decorations = createDecorationSet(vscode);
  };

  const applyDecorations = (editor) => {
    if (!isMarkdownEditor(editor)) {
      return;
    }

    const text = editor.document.getText();
    if (!state.decorations) {
      rebuildDecorations();
    }

    editor.setDecorations(
      state.decorations.inlineMath,
      matchRanges(vscode, text, /\$(?:\\.|[^$\n])+\$/g),
    );
    editor.setDecorations(
      state.decorations.blockMath,
      matchOffsetRanges(vscode, text, findBlockMathDelimiterOffsets(text)),
    );
    editor.setDecorations(
      state.decorations.generalCommand,
      matchRanges(vscode, text, GENERAL_COMMAND_PATTERN),
    );
    editor.setDecorations(
      state.decorations.environmentKeyword,
      matchRanges(vscode, text, ENVIRONMENT_KEYWORD_PATTERN),
    );
    editor.setDecorations(
      state.decorations.environmentName,
      matchRanges(vscode, text, ENVIRONMENT_NAME_PATTERN),
    );
    editor.setDecorations(
      state.decorations.greekLetter,
      matchRanges(vscode, text, GREEK_PATTERN),
    );
  };

  const refreshVisibleEditors = () => {
    for (const editor of vscode.window.visibleTextEditors) {
      if (isMarkdownEditor(editor)) {
        applyDecorations(editor);
      }
    }
  };

  rebuildDecorations();
  refreshVisibleEditors();

  return vscode.Disposable.from(
    completionProvider,
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        applyDecorations(editor);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document === event.document) {
          applyDecorations(editor);
        }
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      refreshVisibleEditors();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("slab.latexColors")) {
        rebuildDecorations();
        refreshVisibleEditors();
      }
    }),
    {
      dispose() {
        disposeDecorations(state.decorations);
      },
    },
  );
}

function isMarkdownEditor(editor) {
  return editor?.document?.languageId === "markdown";
}

function matchRanges(vscode, text, pattern) {
  const ranges = [];

  for (const match of text.matchAll(pattern)) {
    if (typeof match.index !== "number" || !match[0]) {
      continue;
    }

    const start = match.index;
    const end = start + match[0].length;
    ranges.push(
      new vscode.Range(
        offsetToPosition(vscode, text, start),
        offsetToPosition(vscode, text, end),
      ),
    );
  }

  return ranges;
}

function matchOffsetRanges(vscode, text, offsets) {
  return offsets.map(([start, end]) => new vscode.Range(
    offsetToPosition(vscode, text, start),
    offsetToPosition(vscode, text, end),
  ));
}

function findBlockMathDelimiterOffsets(text) {
  const offsets = [];

  for (const match of text.matchAll(/\$\$[\s\S]*?\$\$/g)) {
    if (typeof match.index !== "number" || !match[0] || match[0].length < 4) {
      continue;
    }

    const start = match.index;
    const end = start + match[0].length;
    offsets.push([start, start + 2], [end - 2, end]);
  }

  return offsets;
}

function offsetToPosition(vscode, text, offset) {
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  return new vscode.Position(lines.length - 1, lines.at(-1)?.length ?? 0);
}

function buildLatexCompletions(vscode, replaceRange) {
  return [
    ...ENVIRONMENT_SNIPPETS.map(([label, detail, snippet]) =>
      snippetCompletion(vscode, label, detail, snippet, replaceRange),
    ),
    ...FUNCTION_SNIPPETS.map(([label, detail, snippet]) =>
      snippetCompletion(vscode, label, detail, snippet, replaceRange),
    ),
    ...GREEK_LETTERS.map((letter) => textCompletion(vscode, `\\${letter}`, "Greek letter", replaceRange)),
    ...SYMBOL_COMMANDS.map((command) => textCompletion(vscode, command, "math symbol", replaceRange)),
  ];
}

function snippetCompletion(vscode, label, detail, snippet, replaceRange) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
  item.detail = `Slab LaTeX ${detail}`;
  item.insertText = new vscode.SnippetString(snippet);
  if (replaceRange) {
    item.range = replaceRange;
  }
  return item;
}

function textCompletion(vscode, label, detail, replaceRange) {
  const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Keyword);
  item.detail = `Slab LaTeX ${detail}`;
  item.insertText = label;
  if (replaceRange) {
    item.range = replaceRange;
  }
  return item;
}

function createDecorationSet(vscode) {
  const config = vscode.workspace.getConfiguration("slab");

  return {
    inlineMath: vscode.window.createTextEditorDecorationType({
      borderRadius: "4px",
      color: config.get("latexColors.inlineMath", "#7dcfff"),
    }),
    blockMath: vscode.window.createTextEditorDecorationType({
      borderRadius: "4px",
      backgroundColor: config.get("latexColors.blockMathBackground", "rgba(125, 207, 255, 0.08)"),
      color: config.get("latexColors.blockMathForeground", "#89ddff"),
      isWholeLine: false,
    }),
    generalCommand: vscode.window.createTextEditorDecorationType({
      color: config.get("latexColors.command", "#27d797"),
      fontWeight: "600",
    }),
    environmentKeyword: vscode.window.createTextEditorDecorationType({
      color: config.get("latexColors.environmentKeyword", "#f4d35e"),
      fontWeight: "700",
    }),
    environmentName: vscode.window.createTextEditorDecorationType({
      color: config.get("latexColors.environmentName", "#ff6b6b"),
      fontWeight: "600",
    }),
    greekLetter: vscode.window.createTextEditorDecorationType({
      color: config.get("latexColors.greek", "#ff9f6e"),
      fontStyle: "italic",
    }),
  };
}

function disposeDecorations(decorations) {
  if (!decorations) {
    return;
  }

  for (const decoration of Object.values(decorations)) {
    decoration.dispose();
  }
}

module.exports = {
  findBlockMathDelimiterOffsets,
  registerLatexSupport,
};
