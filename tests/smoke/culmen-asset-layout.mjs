import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  CULMEN_DESTINATION,
  planCopyDestinationUpdate,
} = require("../../src/commands/useCulmenAssetLayout.js");

if (JSON.stringify(CULMEN_DESTINATION) !== JSON.stringify({ "**/*.md": "assets/" })) {
  throw new Error(`Expected the Culmen destination mapping, got ${JSON.stringify(CULMEN_DESTINATION)}.`);
}

if (planCopyDestinationUpdate(undefined) !== "write") {
  throw new Error("Expected an unset value to be written directly.");
}

if (planCopyDestinationUpdate(null) !== "write") {
  throw new Error("Expected a null value to be written directly.");
}

if (planCopyDestinationUpdate({ "**/*.md": "assets/" }) !== "noop") {
  throw new Error("Expected an identical value to be a no-op.");
}

if (planCopyDestinationUpdate({ "**/*.md": "img/" }) !== "confirm") {
  throw new Error("Expected a different value to require confirmation.");
}

console.log("Smoke passed for Culmen asset layout planning.");
