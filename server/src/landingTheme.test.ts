import { describe, expect, it } from "vitest";
import {
  buildThemeOverrideCss,
  sanitizeGoogleFontStylesheetHref,
  sanitizeLandingTheme,
  sanitizeLandingThemeCssValue,
} from "./landingTheme.js";

describe("sanitizeLandingThemeCssValue", () => {
  it("принимает hex и градиент", () => {
    expect(sanitizeLandingThemeCssValue("#0369a1")).toBe("#0369a1");
    expect(sanitizeLandingThemeCssValue("linear-gradient(180deg, #e0f2fe 0%, #fff 100%)")).toBe(
      "linear-gradient(180deg, #e0f2fe 0%, #fff 100%)",
    );
  });

  it("отклоняет url() и прочее опасное", () => {
    expect(sanitizeLandingThemeCssValue("url(https://x.test/a.png)")).toBeNull();
    expect(sanitizeLandingThemeCssValue("red; background: url(x)")).toBeNull();
  });
});

describe("sanitizeGoogleFontStylesheetHref", () => {
  it("только fonts.googleapis.com/css2", () => {
    expect(
      sanitizeGoogleFontStylesheetHref(
        "https://fonts.googleapis.com/css2?family=Manrope:wght@400&display=swap",
      ),
    ).toContain("fonts.googleapis.com/css2");
    expect(sanitizeGoogleFontStylesheetHref("https://evil.com/css2?x=1")).toBeNull();
  });
});

describe("sanitizeLandingTheme", () => {
  it("собирает variables и шрифт", () => {
    const t = sanitizeLandingTheme({
      variables: { "--lp-accent": "#c00", "--lp-unknown": "x" },
      fontFamily: "Georgia, serif",
      fontLinkHref: "https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap",
    });
    expect(t?.variables?.["--lp-accent"]).toBe("#c00");
    expect(Object.keys(t?.variables ?? {})).toEqual(["--lp-accent"]);
    expect(t?.fontFamily).toContain("Georgia");
  });
});

describe("buildThemeOverrideCss", () => {
  it("эмитит блок для класса скина", () => {
    const css = buildThemeOverrideCss(3, {
      variables: { "--lp-accent": "#ff00aa" },
      fontFamily: "Arial, sans-serif",
    });
    expect(css).toContain(".lp.lp-skin-3");
    expect(css).toContain("--lp-accent: #ff00aa");
    expect(css).toContain("--lp-font-stack:");
  });
});
