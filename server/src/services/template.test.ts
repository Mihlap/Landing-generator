import { describe, expect, it } from "vitest";
import { validLandingData } from "../testFixtures.js";
import { renderTemplate } from "./template.js";

describe("renderTemplate", () => {
  it("включает экранированный title в HTML", () => {
    const data = {
      ...validLandingData,
      title: 'Угол <script>alert(1)</script>',
    };
    const html = renderTemplate("dental", data);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("генерирует HTML для каждого templateId", () => {
    const ids = ["dental", "auto", "repair", "realestate", "ecommerce"] as const;
    for (const templateId of ids) {
      const html = renderTemplate(templateId, { ...validLandingData, templateId });
      expect(html).toMatch(/^<!DOCTYPE html>/i);
      expect(html.length).toBeGreaterThan(500);
    }
  });

  it("поддерживает locale en", () => {
    const html = renderTemplate("ecommerce", {
      ...validLandingData,
      locale: "en",
      templateId: "ecommerce",
    });
    expect(html).toContain('lang="en"');
  });

  it("применяет skinId 1–10 и класс lp-skin", () => {
    const html = renderTemplate("dental", { ...validLandingData, skinId: 10 });
    expect(html).toContain('class="lp lp-skin-10"');
    expect(html).toMatch(/lp-skin-10/);
  });

  it("учитывает порядок секций из данных", () => {
    const html = renderTemplate("auto", {
      ...validLandingData,
      templateId: "auto",
      sections: ["hero", "reviews", "services", "footer"],
    });
    const hero = html.indexOf('aria-label="Hero"');
    const rev = html.indexOf('id="lp-rev"');
    const svc = html.indexOf('id="lp-svc"');
    expect(hero).toBeGreaterThan(-1);
    expect(hero).toBeLessThan(rev);
    expect(rev).toBeLessThan(svc);
  });

  it("переносит длинные слова (overflow-wrap в стилях)", () => {
    const html = renderTemplate("dental", validLandingData);
    expect(html).toContain("overflow-wrap");
  });
});
