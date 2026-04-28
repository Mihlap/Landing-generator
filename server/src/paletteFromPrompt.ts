import {
  sanitizeLandingTheme,
  sanitizeLandingThemeCssValue,
  type LandingTheme,
  type LandingThemeVarKey,
} from "./landingTheme.js";

const HEX_IN_TEXT =
  /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

const NAMED_COLOR_HINTS: { re: RegExp; hex: string }[] = [
  { re: /бордов|бордо|bordo|burgundy/i, hex: "#722f37" },
  { re: /золот|золотист|gold/i, hex: "#c5a059" },
  { re: /изумруд|emerald/i, hex: "#059669" },
  { re: /бирюз|бирюзов|turquoise|teal/i, hex: "#0d9488" },
  { re: /коралл|coral/i, hex: "#fb7185" },
  { re: /лаванд|lilac|лаванда/i, hex: "#c4b5fd" },
  { re: /нежно[\s-]*роз|пудров|powder\s*pink|blush/i, hex: "#fbcfe8" },
  { re: /фиолет|лилов|purple|violet/i, hex: "#7c3aed" },
  { re: /индиго|indigo/i, hex: "#4f46e5" },
  { re: /мятн|мята|mint/i, hex: "#99f6e4" },
  { re: /морск|аквамарин|aqua(marine)?/i, hex: "#0ea5e9" },
  { re: /терракот|terracotta/i, hex: "#c2410c" },
  { re: /шоколад|chocolate/i, hex: "#78350f" },
  { re: /оливк|olive/i, hex: "#65a30d" },
  { re: /серебр|silver/i, hex: "#94a3b8" },
  { re: /малинов|малина|raspberry/i, hex: "#db2777" },
  { re: /салатов|лайм|lime\s*green/i, hex: "#84cc16" },
  { re: /розов|\bpink\b/i, hex: "#ec4899" },
];

function normalizeHexToken(raw: string): string | null {
  let h = raw.startsWith("#") ? raw.slice(1) : raw;
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 6 || h.length === 8) return `#${h.toLowerCase()}`;
  return null;
}

export function extractHexColorsFromPrompt(prompt: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  HEX_IN_TEXT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HEX_IN_TEXT.exec(prompt)) !== null) {
    const norm = normalizeHexToken(`#${m[1]}`);
    if (!norm) continue;
    const key = norm.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

function namedColorsFromPrompt(prompt: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { re, hex } of NAMED_COLOR_HINTS) {
    if (!re.test(prompt)) continue;
    const k = hex.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(hex);
  }
  return out;
}

function withAlpha7(hex7: string, alpha2: string): string | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex7)) return null;
  const a = sanitizeLandingThemeCssValue(`${hex7}${alpha2}`);
  return a;
}

function safeHexCss(g: string | undefined): string | undefined {
  if (!g) return undefined;
  const norm = normalizeHexToken(g.startsWith("#") ? g : `#${g}`);
  if (!norm) return undefined;
  return sanitizeLandingThemeCssValue(norm) ?? undefined;
}

function extractLabeledHexColors(prompt: string): { pageBg?: string; accent?: string } {
  const out: { pageBg?: string; accent?: string } = {};
  const bg = prompt.match(/(?:фон|фона|background)\s*[:\s—–-]*\s*(#[0-9a-fA-F]{3,8})\b/i);
  const ac = prompt.match(
    /(?:акцент|кнопк\w*|accent|primary|brand|фирменн\w*)\s*[:\s—–-]*\s*(#[0-9a-fA-F]{3,8})\b/i,
  );
  const pb = safeHexCss(bg?.[1]);
  const ax = safeHexCss(ac?.[1]);
  if (pb) out.pageBg = pb;
  if (ax) out.accent = ax;
  return out;
}

export function inferThemeVariablesFromPrompt(prompt: string): Partial<Record<LandingThemeVarKey, string>> {
  const labeled = extractLabeledHexColors(prompt);
  const allHex = extractHexColorsFromPrompt(prompt);
  const named = namedColorsFromPrompt(prompt).filter(
    (h) => !allHex.some((x) => x.toLowerCase() === h.toLowerCase()),
  );

  let accent = labeled.accent;
  let pageBg = labeled.pageBg;

  if (!accent && !pageBg) {
    if (allHex.length === 0 && named.length === 0) return {};
    if (allHex.length >= 1) accent = safeHexCss(allHex[0]);
    if (!accent && named.length >= 1) accent = safeHexCss(named[0]);
    if (allHex.length >= 2) pageBg = safeHexCss(allHex[1]);
  } else {
    if (!accent) {
      const cand =
        allHex.find((h) => !pageBg || h.toLowerCase() !== pageBg.toLowerCase()) ?? allHex[0] ?? named[0];
      accent = safeHexCss(cand);
    }
    if (!pageBg) {
      const cand = allHex.find((h) => !accent || h.toLowerCase() !== accent.toLowerCase());
      pageBg = cand ? safeHexCss(cand) : undefined;
    }
  }

  if (!accent) return {};

  const out: Partial<Record<LandingThemeVarKey, string>> = {};
  out["--lp-accent"] = accent;

  const soft = withAlpha7(accent.length === 9 ? accent.slice(0, 7) : accent, "22");
  if (soft) out["--lp-accent-soft"] = soft;

  if (pageBg) {
    out["--lp-page-bg"] = pageBg;
    const heroTint = withAlpha7(pageBg.length === 9 ? pageBg.slice(0, 7) : pageBg, "33");
    if (heroTint) {
      const g = sanitizeLandingThemeCssValue(`linear-gradient(135deg, ${heroTint} 0%, #ffffff 100%)`);
      if (g) out["--lp-hero-bg"] = g;
    }
  } else {
    const tint = withAlpha7(accent.length === 9 ? accent.slice(0, 7) : accent, "18");
    if (tint) {
      const g = sanitizeLandingThemeCssValue(`linear-gradient(180deg, ${tint} 0%, #ffffff 55%)`);
      if (g) out["--lp-hero-bg"] = g;
    }
    const pg = sanitizeLandingThemeCssValue(`linear-gradient(180deg, #fafafa 0%, #ffffff 50%)`);
    if (pg) out["--lp-page-bg"] = pg;
  }

  const used = new Set([accent.toLowerCase(), pageBg?.toLowerCase()].filter(Boolean) as string[]);
  if (allHex.length >= 3) {
    const c2raw = allHex.find((c) => !used.has(c.toLowerCase()));
    const c2 = c2raw ? safeHexCss(c2raw) : undefined;
    if (c2) {
      const border = withAlpha7(c2.length === 9 ? c2.slice(0, 7) : c2, "55");
      if (border) out["--lp-border"] = border;
    }
  }

  return out;
}

export function mergeThemeWithPromptColors(coreTheme: unknown, prompt: string): LandingTheme | undefined {
  const model = sanitizeLandingTheme(coreTheme);
  const inferred = inferThemeVariablesFromPrompt(prompt);
  const mergedVars: Partial<Record<LandingThemeVarKey, string>> = {
    ...(model?.variables ?? {}),
    ...inferred,
  };

  const payload: Record<string, unknown> = {};
  if (Object.keys(mergedVars).length) payload.variables = mergedVars;
  if (model?.fontFamily) payload.fontFamily = model.fontFamily;
  if (model?.fontLinkHref) payload.fontLinkHref = model.fontLinkHref;

  if (Object.keys(payload).length === 0) return undefined;
  return sanitizeLandingTheme(payload);
}
