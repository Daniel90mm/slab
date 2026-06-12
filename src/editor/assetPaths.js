const fs = require("node:fs");
const path = require("node:path");

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);

function matchImageLinkPrefix(linePrefix) {
  const match = String(linePrefix || "").match(/!\[[^\]]*\]\(([^)]*)$/);
  if (!match) {
    return null;
  }

  return { typed: match[1] };
}

function listAssetPaths(documentDir, fsModule = fs) {
  const assetsDir = path.join(documentDir, "assets");
  let entries;

  try {
    entries = fsModule.readdirSync(assetsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => `assets/${entry.name}`)
    .sort();
}

module.exports = {
  matchImageLinkPrefix,
  listAssetPaths,
};
