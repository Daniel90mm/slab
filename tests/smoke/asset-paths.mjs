import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { matchImageLinkPrefix, listAssetPaths } = require("../../src/editor/assetPaths.js");

const insideLink = matchImageLinkPrefix("Some text ![alt](ass");
if (!insideLink || insideLink.typed !== "ass") {
  throw new Error(`Expected to match inside an image link, got ${JSON.stringify(insideLink)}.`);
}

const dotSlash = matchImageLinkPrefix("![](./assets/");
if (!dotSlash || dotSlash.typed !== "./assets/") {
  throw new Error("Expected ./assets/ prefixes to match.");
}

const emptyTarget = matchImageLinkPrefix("![diagram](");
if (!emptyTarget || emptyTarget.typed !== "") {
  throw new Error("Expected an empty link target to match.");
}

if (matchImageLinkPrefix("plain text") !== null) {
  throw new Error("Expected plain text to not match.");
}

if (matchImageLinkPrefix("[link](ass") !== null) {
  throw new Error("Expected non-image links to not match.");
}

if (matchImageLinkPrefix("![alt](assets/x.png) done") !== null) {
  throw new Error("Expected closed links to not match.");
}

const fixtureDir = path.resolve("tests/smoke/fixtures/asset-note");
const assets = listAssetPaths(fixtureDir);
if (JSON.stringify(assets) !== JSON.stringify(["assets/diagram.svg", "assets/plot.png"])) {
  throw new Error(`Expected sorted image assets only, got ${JSON.stringify(assets)}.`);
}

const missing = listAssetPaths(path.resolve("tests/smoke/fixtures"));
if (!Array.isArray(missing) || missing.length !== 0) {
  throw new Error("Expected a missing assets folder to produce an empty list.");
}

console.log("Smoke passed for asset path completion helpers.");
