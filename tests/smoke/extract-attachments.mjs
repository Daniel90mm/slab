import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractAttachments } = require("../../src/attachments/extract.js");

const fixturePath = path.resolve("tests/smoke/fixtures/with-attachment.ipynb");
const fixtureBytes = fs.readFileSync(fixturePath);
const fixtureJson = JSON.parse(fixtureBytes.toString("utf8"));
const expectedBytes = Buffer.from(
  fixtureJson.cells[0].attachments["tiny.png"]["image/png"],
  "base64",
);

const { nextJson, assets } = extractAttachments(fixtureBytes, {
  now: new Date(2026, 3, 17, 15, 4, 5),
});

if ("attachments" in nextJson.cells[0]) {
  throw new Error("Expected markdown cell attachments to be removed.");
}

const nextSource = normalize(nextJson.cells[0].source.join(""));
if (!nextSource.includes("./assets/paste-20260417-150405.png")) {
  throw new Error(`Expected extracted source path, got: ${nextSource}`);
}

if (nextSource.includes("attachment:")) {
  throw new Error(`Expected attachment references to be removed, got: ${nextSource}`);
}

if (assets.length !== 1) {
  throw new Error(`Expected exactly one extracted asset, got ${assets.length}.`);
}

if (assets[0].path !== "./assets/paste-20260417-150405.png") {
  throw new Error(`Unexpected asset path: ${assets[0].path}`);
}

if (!Buffer.from(assets[0].bytes).equals(expectedBytes)) {
  throw new Error("Extracted asset bytes did not match the attachment payload.");
}

console.log("Smoke passed for notebook attachment extraction.");

function normalize(value) {
  return String(value || "").replace(/\r\n/g, "\n").trimEnd();
}
