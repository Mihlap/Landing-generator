export const LANDING_THEME_VARIABLE_KEYS = [
  "--lp-page-bg",
  "--lp-page-fg",
  "--lp-muted",
  "--lp-surface",
  "--lp-surface-alt",
  "--lp-accent",
  "--lp-accent-on",
  "--lp-accent-soft",
  "--lp-border",
  "--lp-hero-bg",
] as const;

export type LandingThemeVarKey = (typeof LANDING_THEME_VARIABLE_KEYS)[number];

const THEME_VAR_SET = new Set<string>(LANDING_THEME_VARIABLE_KEYS);

export type LandingTheme = {
  variables?: Partial<Record<LandingThemeVarKey, string>>;
  fontFamily?: string;
  fontLinkHref?: string;
};

const MAX_CSS_VALUE_LEN = 480;
const MAX_FONT_LEN = 320;
const MAX_FONT_LINK_LEN = 512;

function hasDangerousCssToken(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("url(") ||
    t.includes("@import") ||
    t.includes("expression(") ||
    t.includes("javascript:") ||
    t.includes("</") ||
    t.includes("<!--") ||
    t.includes("\\") ||
    t.includes("\n") ||
    t.includes("\r") ||
    t.includes("`")
  );
}

export function sanitizeLandingThemeCssValue(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > MAX_CSS_VALUE_LEN) return null;
  if (hasDangerousCssToken(s)) return null;
  return s;
}

export function sanitizeFontFamilyStack(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > MAX_FONT_LEN) return null;
  if (/[;{}]/.test(s) || /url\s*\(/i.test(s) || hasDangerousCssToken(s)) return null;
  return s;
}

export function sanitizeGoogleFontStylesheetHref(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > MAX_FONT_LINK_LEN) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const h = u.hostname.toLowerCase();
  if (h !== "fonts.googleapis.com") return null;
  if (!u.pathname.startsWith("/css2")) return null;
  return u.toString();
}

export function sanitizeLandingTheme(input: unknown): LandingTheme | undefined {
  if (!input || typeof input !== "object") return undefined;
  const o = input as Record<string, unknown>;
  const out: LandingTheme = {};

  const varsIn = o.variables;
  if (varsIn && typeof varsIn === "object" && !Array.isArray(varsIn)) {
    const variables: Partial<Record<LandingThemeVarKey, string>> = {};
    for (const [k, v] of Object.entries(varsIn as Record<string, unknown>)) {
      if (!THEME_VAR_SET.has(k)) continue;
      const safe = sanitizeLandingThemeCssValue(String(v ?? ""));
      if (safe) variables[k as LandingThemeVarKey] = safe;
    }
    if (Object.keys(variables).length) out.variables = variables;
  }

  const ff = sanitizeFontFamilyStack(String(o.fontFamily ?? ""));
  if (ff) out.fontFamily = ff;

  const link = sanitizeGoogleFontStylesheetHref(String(o.fontLinkHref ?? ""));
  if (link) out.fontLinkHref = link;

  if (!out.variables && !out.fontFamily && !out.fontLinkHref) return undefined;
  return out;
}

export function buildThemeOverrideCss(skinId: number, theme: LandingTheme | undefined): string {
  if (!theme) return "";
  const sid = Math.min(10, Math.max(1, Math.floor(skinId)));
  const lines: string[] = [];
  if (theme.variables) {
    for (const k of LANDING_THEME_VARIABLE_KEYS) {
      const v = theme.variables[k];
      if (!v) continue;
      const safe = sanitizeLandingThemeCssValue(v);
      if (safe) lines.push(`    ${k}: ${safe};`);
    }
  }
  if (theme.fontFamily) {
    const ff = sanitizeFontFamilyStack(theme.fontFamily);
    if (ff) lines.push(`    --lp-font-stack: ${ff};`);
  }
  if (!lines.length) return "";
  return `  .lp.lp-skin-${sid} {\n${lines.join("\n")}\n  }`;
}
