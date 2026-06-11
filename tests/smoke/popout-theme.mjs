import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { SLAB_THEME_PRESETS, resolvePopoutPalette } = require("../../src/sidebar/slabThemes.js");
const { renderPreviewShell } = require("../../src/preview/registerExternalPreview.js");

const REQUIRED_KEYS = ["colorScheme", "background", "surface", "text", "muted", "accent", "border"];

for (const [id, preset] of Object.entries(SLAB_THEME_PRESETS)) {
  if (!preset.popout || typeof preset.popout !== "object") {
    throw new Error(`Preset ${id} is missing a popout palette.`);
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof preset.popout[key] !== "string" || preset.popout[key] === "") {
      throw new Error(`Preset ${id} popout palette is missing ${key}.`);
    }
  }
}

if (resolvePopoutPalette(SLAB_THEME_PRESETS, "does-not-exist") !== SLAB_THEME_PRESETS.default.popout) {
  throw new Error("Expected unknown theme ids to fall back to the default popout palette.");
}

if (resolvePopoutPalette(SLAB_THEME_PRESETS, "miami") !== SLAB_THEME_PRESETS.miami.popout) {
  throw new Error("Expected known theme ids to resolve their own popout palette.");
}

if (resolvePopoutPalette(undefined, "default") === undefined) {
  throw new Error("Expected a missing preset map to still produce a palette.");
}

const html = renderPreviewShell(SLAB_THEME_PRESETS.miami.popout);
if (!html.includes(`--slab-bg: ${SLAB_THEME_PRESETS.miami.popout.background}`)) {
  throw new Error("Expected the preview shell to inject the palette background variable.");
}

if (!html.includes(`color-scheme: ${SLAB_THEME_PRESETS.miami.popout.colorScheme}`)) {
  throw new Error("Expected the preview shell to set the palette color scheme.");
}

const fallbackHtml = renderPreviewShell();
if (!fallbackHtml.includes(`--slab-bg: ${SLAB_THEME_PRESETS.default.popout.background}`)) {
  throw new Error("Expected the preview shell to fall back to the default palette.");
}

console.log("Smoke passed for popout theme palettes.");
