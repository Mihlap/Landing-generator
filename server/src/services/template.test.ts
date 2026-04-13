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

  it("рендерит галерею и карту при данных", () => {
    const html = renderTemplate("auto", {
      ...validLandingData,
      templateId: "auto",
      sections: ["hero", "gallery", "map", "footer"],
      galleryItems: [
        {
          src: "https://images.unsplash.com/photo-1486262715619-567beee29d4f?auto=format&fit=crop&w=720&q=75",
          alt: "Первый",
        },
        {
          src: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=720&q=75",
          alt: "Второй",
        },
      ],
      mapEmbedSrc: "https://yandex.ru/map-widget/v1/?ll=37.617635%2C55.755814&z=12",
    });
    expect(html).toContain("lp-gallery-grid");
    expect(html).toContain('rel="preconnect"');
    expect(html).toMatch(/images\.unsplash\.com|\/image\?prompt=/);
    expect(html).toMatch(/rel="preload"[^>]+as="image"/);
    expect(html).toMatch(/w=520/);
    expect(html).toMatch(/loading="eager"[^>]*fetchpriority="high"/);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("lp-map-frame");
    expect(html).toContain("yandex.ru/map-widget");
  });

  it("рендерит соцссылки в подвале (иконка для Telegram)", () => {
    const html = renderTemplate("auto", {
      ...validLandingData,
      templateId: "auto",
      sections: ["hero", "footer"],
      socialLinks: [{ label: "TG", href: "https://t.me/example" }],
    });
    expect(html).toContain("lp-footer-social");
    expect(html).toContain("https://t.me/example");
    expect(html).toContain("lp-footer-icon");
    expect(html).toContain('aria-label="TG"');
  });

  it("подключает theme: переменные, шрифт и Google Fonts link", () => {
    const html = renderTemplate("dental", {
      ...validLandingData,
      templateId: "dental",
      skinId: 8,
      sections: ["hero", "footer"],
      theme: {
        variables: { "--lp-accent": "#0369a1", "--lp-page-bg": "#f0f9ff" },
        fontFamily: "'Manrope', system-ui, sans-serif",
        fontLinkHref: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap",
      },
    });
    expect(html).toContain("fonts.googleapis.com/css2");
    expect(html).toContain("--lp-accent: #0369a1");
    expect(html).toContain("--lp-font-stack:");
  });

  it("для салона на шаблоне repair подставляет заголовки услуг/карты, не «ремонт»", () => {
    const html = renderTemplate("repair", {
      ...validLandingData,
      title: "Женская парикмахерская «Стиль»",
      templateId: "repair",
      sections: ["hero", "services", "map", "footer"],
      mapEmbedSrc: "https://yandex.ru/map-widget/v1/?ll=37.617635%2C55.755814&z=12",
    });
    expect(html).toContain(">Услуги<");
    expect(html).toContain("Как нас найти");
    expect(html).not.toContain("Что ремонтируем");
    expect(html).not.toContain("Зона выезда");
    expect(html).toContain("Красота и стиль");
  });
});
