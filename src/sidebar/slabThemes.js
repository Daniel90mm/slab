const SLAB_THEME_PRESETS = {
  default: {
    label: "Default",
    description: "Clean neon contrast tuned for dark editors.",
    colors: {
      environmentKeyword: "#f4d35e",
      environmentName: "#ff6b6b",
      greek: "#ff9f6e",
      command: "#27d797",
      inlineMath: "#7dcfff",
      blockMathForeground: "#89ddff",
      blockMathBackground: "rgba(125, 207, 255, 0.08)",
    },
    popout: {
      colorScheme: "dark",
      background: "#111111",
      surface: "#171717",
      text: "#f2efe8",
      muted: "#9a9488",
      accent: "#27d797",
      border: "#2c2c2c",
    },
  },
  miami: {
    label: "Miami",
    description: "Hot pink, electric cyan, emerald, and sunlit yellow.",
    colors: {
      environmentKeyword: "#ffe66d",
      environmentName: "#ff4fa3",
      greek: "#7ce7ff",
      command: "#29f0b4",
      inlineMath: "#6ad6ff",
      blockMathForeground: "#ff8cf5",
      blockMathBackground: "rgba(255, 79, 163, 0.12)",
    },
    popout: {
      colorScheme: "dark",
      background: "#14101c",
      surface: "#1c1626",
      text: "#f5ecff",
      muted: "#9b8fb0",
      accent: "#ff4fa3",
      border: "#322843",
    },
  },
  crystal: {
    label: "Crystal",
    description: "Icy blue, aqua, lilac, and bright frost contrast.",
    colors: {
      environmentKeyword: "#d7f9ff",
      environmentName: "#93c5fd",
      greek: "#c084fc",
      command: "#5eead4",
      inlineMath: "#bae6fd",
      blockMathForeground: "#e9d5ff",
      blockMathBackground: "rgba(186, 230, 253, 0.10)",
    },
    popout: {
      colorScheme: "dark",
      background: "#0d1420",
      surface: "#131c2c",
      text: "#e8f4ff",
      muted: "#8fa3bd",
      accent: "#93c5fd",
      border: "#233448",
    },
  },
  sand: {
    label: "Sand",
    description: "Papyrus warmth with desert gold and oxidized teal.",
    colors: {
      environmentKeyword: "#f6bd60",
      environmentName: "#e07a5f",
      greek: "#84a59d",
      command: "#f2cc8f",
      inlineMath: "#f4f1de",
      blockMathForeground: "#f7d794",
      blockMathBackground: "rgba(242, 204, 143, 0.10)",
    },
    popout: {
      colorScheme: "dark",
      background: "#1a1612",
      surface: "#221d17",
      text: "#f4f1de",
      muted: "#a89a85",
      accent: "#f6bd60",
      border: "#38302a",
    },
  },
  papyrus: {
    label: "Papyrus",
    description: "Parchment, terracotta, lapis, and palm green.",
    colors: {
      environmentKeyword: "#d4a373",
      environmentName: "#e76f51",
      greek: "#2a9d8f",
      command: "#457b9d",
      inlineMath: "#fef3c7",
      blockMathForeground: "#e9c46a",
      blockMathBackground: "rgba(212, 163, 115, 0.12)",
    },
    popout: {
      colorScheme: "light",
      background: "#f7f1e3",
      surface: "#efe6d2",
      text: "#2b2419",
      muted: "#6f6450",
      accent: "#b23a1f",
      border: "#d8cbb2",
    },
  },
};

function resolvePopoutPalette(presets, themeId) {
  return presets?.[themeId]?.popout
    || presets?.default?.popout
    || SLAB_THEME_PRESETS.default.popout;
}

module.exports = {
  SLAB_THEME_PRESETS,
  resolvePopoutPalette,
};
