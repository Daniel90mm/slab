import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  detectMimeType,
  isPathInsideBaseDir,
  resolvePreviewAssetUrl,
  rewritePreviewAssetPaths,
} = require("../../src/preview/registerExternalPreview.js");

const baseDir = path.resolve("tests/smoke/fixtures");
const markdown = [
  "![Plot](images/plot.png)",
  '<img alt="diagram" src="./diagram.svg">',
  "![Remote](https://example.com/remote.png)",
].join("\n");

const rewritten = rewritePreviewAssetPaths(markdown, baseDir, 4123);
if (!rewritten.includes("http://127.0.0.1:4123/file?path=")) {
  throw new Error(`Expected local image paths to be rewritten, got ${rewritten}.`);
}

if (!rewritten.includes("https://example.com/remote.png")) {
  throw new Error("Expected remote image URLs to stay unchanged.");
}

const assetUrl = resolvePreviewAssetUrl(baseDir, "images/plot.png", 4123);
if (!assetUrl || !assetUrl.includes(encodeURIComponent(path.join(baseDir, "images/plot.png")))) {
  throw new Error(`Expected a local asset URL, got ${assetUrl}.`);
}

if (resolvePreviewAssetUrl(baseDir, "data:image/png;base64,abc", 4123) !== null) {
  throw new Error("Expected data URLs to stay out of preview asset rewriting.");
}

if (!isPathInsideBaseDir(path.join(baseDir, "images/plot.png"), baseDir)) {
  throw new Error("Expected child asset path to be allowed.");
}

if (isPathInsideBaseDir(path.resolve(baseDir, "../outside.png"), baseDir)) {
  throw new Error("Expected parent traversal path to be rejected.");
}

if (detectMimeType("plot.webp") !== "image/webp") {
  throw new Error("Expected webp MIME detection.");
}

console.log("Smoke passed for preview asset rewriting helpers.");
