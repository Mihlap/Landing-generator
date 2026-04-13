import { describe, expect, it } from "vitest";
import { repairLandingHtml, validateLandingHtml } from "./landingHtmlValidate.js";

describe("validateLandingHtml", () => {
  it("находит отсутствие lang и viewport", () => {
    const html = "<!DOCTYPE html><html><head></head><body><h1>x</h1></body></html>";
    const issues = validateLandingHtml(html);
    expect(issues.some((i) => i.code === "missing_html_lang")).toBe(true);
    expect(issues.some((i) => i.code === "missing_viewport")).toBe(true);
  });

  it("принимает корректный каркас", () => {
    const html = `<!DOCTYPE html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><h1>x</h1></body></html>`;
    const issues = validateLandingHtml(html);
    expect(issues.filter((i) => i.code === "missing_h1")).toHaveLength(0);
    expect(issues.filter((i) => i.code === "missing_html_lang")).toHaveLength(0);
  });

  it("детектит duplicate id", () => {
    const html = `<!DOCTYPE html><html lang="ru"><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><h1>x</h1><div id="a"></div><span id="a"></span></body></html>`;
    const issues = validateLandingHtml(html);
    expect(issues.some((i) => i.code === "duplicate_id" && i.detail === "a")).toBe(true);
  });
});

describe("repairLandingHtml", () => {
  it("убирает javascript: из href", () => {
    const html = `<a href="javascript:alert(1)">x</a>`;
    expect(repairLandingHtml(html)).toContain('href="#"');
    expect(repairLandingHtml(html)).not.toContain("javascript:");
  });
});
