const COMMAND_ID = "slab.useCulmenAssetLayout";
const DESTINATION_KEY = "copyFiles.destination";
const CULMEN_DESTINATION = { "**/*.md": "assets/" };

function planCopyDestinationUpdate(existingGlobalValue) {
  if (existingGlobalValue === undefined || existingGlobalValue === null) {
    return "write";
  }
  if (JSON.stringify(existingGlobalValue) === JSON.stringify(CULMEN_DESTINATION)) {
    return "noop";
  }
  return "confirm";
}

function registerUseCulmenAssetLayoutCommand(vscode) {
  return vscode.commands.registerCommand(COMMAND_ID, async () => {
    const config = vscode.workspace.getConfiguration("markdown");
    const existing = config.inspect(DESTINATION_KEY)?.globalValue;
    const plan = planCopyDestinationUpdate(existing);

    if (plan === "noop") {
      await vscode.window.showInformationMessage(
        "Slab: pasted images already land in assets/ next to each note.",
      );
      return;
    }

    if (plan === "confirm") {
      const choice = await vscode.window.showWarningMessage(
        "markdown.copyFiles.destination already has a custom value. Replace it so pasted images land in assets/ next to each note?",
        "Replace",
        "Cancel",
      );
      if (choice !== "Replace") {
        return;
      }
    }

    await config.update(DESTINATION_KEY, CULMEN_DESTINATION, vscode.ConfigurationTarget.Global);
    await vscode.window.showInformationMessage(
      "Slab: pasted images will now be saved to assets/ next to each markdown note.",
    );
  });
}

module.exports = {
  COMMAND_ID,
  CULMEN_DESTINATION,
  planCopyDestinationUpdate,
  registerUseCulmenAssetLayoutCommand,
};
