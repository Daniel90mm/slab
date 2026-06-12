const path = require("node:path");
const { matchImageLinkPrefix, listAssetPaths } = require("./assetPaths.js");

function registerAssetCompletion(vscode) {
  return vscode.languages.registerCompletionItemProvider(
    [{ language: "markdown", scheme: "file" }],
    {
      provideCompletionItems(document, position) {
        const linePrefix = document.lineAt(position).text.slice(0, position.character);
        const link = matchImageLinkPrefix(linePrefix);
        if (!link) {
          return [];
        }

        const documentDir = path.dirname(document.uri.fsPath);
        const assetPaths = listAssetPaths(documentDir);
        if (assetPaths.length === 0) {
          return [];
        }

        const useDotSlash = link.typed.startsWith("./");
        const replaceRange = new vscode.Range(
          position.line,
          position.character - link.typed.length,
          position.line,
          position.character,
        );

        return assetPaths.map((assetPath) => {
          const insertPath = useDotSlash ? `./${assetPath}` : assetPath;
          const item = new vscode.CompletionItem(insertPath, vscode.CompletionItemKind.File);
          item.detail = "Slab asset";
          item.insertText = insertPath;
          item.range = replaceRange;
          return item;
        });
      },
    },
    "(",
    "/",
  );
}

module.exports = {
  registerAssetCompletion,
};
