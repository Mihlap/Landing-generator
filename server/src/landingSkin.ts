import type { SkinId } from "./services/ai.js";

type SkinVars = Record<string, string>;

const SKINS: Record<SkinId, SkinVars> = {
  1: {
    "--lp-page-bg": "linear-gradient(180deg, #f0f9ff 0%, #ffffff 45%)",
    "--lp-page-fg": "#0f172a",
    "--lp-muted": "#64748b",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#f8fafc",
    "--lp-accent": "#0284c7",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(2, 132, 199, 0.12)",
    "--lp-border": "rgba(14, 165, 233, 0.22)",
    "--lp-hero-bg": "linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)",
  },
  2: {
    "--lp-page-bg": "#0f172a",
    "--lp-page-fg": "#e2e8f0",
    "--lp-muted": "#94a3b8",
    "--lp-surface": "#1e293b",
    "--lp-surface-alt": "#0f172a",
    "--lp-accent": "#ea580c",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(234, 88, 12, 0.15)",
    "--lp-border": "#334155",
    "--lp-hero-bg": "linear-gradient(160deg, #1e293b 0%, #0f172a 55%)",
  },
  3: {
    "--lp-page-bg": "#fffbeb",
    "--lp-page-fg": "#422006",
    "--lp-muted": "#78716c",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#fef3c7",
    "--lp-accent": "#d97706",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(217, 119, 6, 0.14)",
    "--lp-border": "rgba(180, 83, 9, 0.2)",
    "--lp-hero-bg": "linear-gradient(145deg, #fef3c7 0%, #ffffff 100%)",
  },
  4: {
    "--lp-page-bg": "#1c1917",
    "--lp-page-fg": "#fafaf9",
    "--lp-muted": "#a8a29e",
    "--lp-surface": "#292524",
    "--lp-surface-alt": "#1c1917",
    "--lp-accent": "#d6b656",
    "--lp-accent-on": "#1c1917",
    "--lp-accent-soft": "rgba(214, 182, 86, 0.12)",
    "--lp-border": "#44403c",
    "--lp-hero-bg": "linear-gradient(135deg, #292524 0%, #0c0a09 100%)",
  },
  5: {
    "--lp-page-bg": "#fafafa",
    "--lp-page-fg": "#171717",
    "--lp-muted": "#737373",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#f5f5f5",
    "--lp-accent": "#16a34a",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(22, 163, 74, 0.12)",
    "--lp-border": "#e5e5e5",
    "--lp-hero-bg": "linear-gradient(180deg, #ecfdf5 0%, #fafafa 100%)",
  },
  6: {
    "--lp-page-bg": "linear-gradient(180deg, #faf5ff 0%, #ffffff 50%)",
    "--lp-page-fg": "#3b0764",
    "--lp-muted": "#7e22ce",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#f3e8ff",
    "--lp-accent": "#9333ea",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(147, 51, 234, 0.12)",
    "--lp-border": "rgba(147, 51, 234, 0.18)",
    "--lp-hero-bg": "linear-gradient(135deg, #f3e8ff 0%, #ffffff 100%)",
  },
  7: {
    "--lp-page-bg": "#fff1f2",
    "--lp-page-fg": "#881337",
    "--lp-muted": "#9f1239",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#ffe4e6",
    "--lp-accent": "#e11d48",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(225, 29, 72, 0.12)",
    "--lp-border": "rgba(225, 29, 72, 0.16)",
    "--lp-hero-bg": "linear-gradient(160deg, #ffe4e6 0%, #ffffff 100%)",
  },
  8: {
    "--lp-page-bg": "#f8fafc",
    "--lp-page-fg": "#0f172a",
    "--lp-muted": "#64748b",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#f1f5f9",
    "--lp-accent": "#0f172a",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(15, 23, 42, 0.06)",
    "--lp-border": "#e2e8f0",
    "--lp-hero-bg": "linear-gradient(180deg, #f1f5f9 0%, #ffffff 100%)",
  },
  9: {
    "--lp-page-bg": "#ecfdf5",
    "--lp-page-fg": "#064e3b",
    "--lp-muted": "#047857",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#d1fae5",
    "--lp-accent": "#059669",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(5, 150, 105, 0.14)",
    "--lp-border": "rgba(5, 150, 105, 0.2)",
    "--lp-hero-bg": "linear-gradient(145deg, #d1fae5 0%, #ffffff 100%)",
  },
  10: {
    "--lp-page-bg": "#eef2ff",
    "--lp-page-fg": "#1e1b4b",
    "--lp-muted": "#4338ca",
    "--lp-surface": "#ffffff",
    "--lp-surface-alt": "#e0e7ff",
    "--lp-accent": "#4f46e5",
    "--lp-accent-on": "#ffffff",
    "--lp-accent-soft": "rgba(79, 70, 229, 0.14)",
    "--lp-border": "rgba(79, 70, 229, 0.18)",
    "--lp-hero-bg": "linear-gradient(135deg, #e0e7ff 0%, #ffffff 100%)",
  },
};

function varsToCssBlock(className: string, vars: SkinVars): string {
  const body = Object.entries(vars)
    .map(([k, v]) => `    ${k}: ${v};`)
    .join("\n");
  return `  ${className} {\n${body}\n  }`;
}

const SKIN_IDS: SkinId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function buildSkinStylesheet(): string {
  const blocks: string[] = [];
  for (const id of SKIN_IDS) {
    blocks.push(varsToCssBlock(`.lp.lp-skin-${id}`, SKINS[id]));
  }
  return blocks.join("\n");
}
