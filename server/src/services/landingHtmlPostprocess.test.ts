import { describe, expect, it, vi } from "vitest";
import {
  enhanceLandingHtml,
  normalizeLayoutWidths,
  replaceCanonicalSocialSvgInAnchors,
} from "./landingHtmlPostprocess.js";

describe("replaceCanonicalSocialSvgInAnchors", () => {
  it("подменяет битый SVG в ссылке Telegram на канонический", () => {
    const html = `<a href="https://t.me/foo" aria-label="Telegram"><svg viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12 0 5.302 3.438 9.758 8.052 11.303.635.182 1.348.351 2.064.484 1.711.218 3.425.36 5.158.36 1.73 0 3.406-.142 5.065-.427 1.659-.285 3.045-.636 4.168-1.124.888-.488 1.463-1.088 1.976-1.767.513-.68 .953-1.46 1.326-2.351.373-.891.605-1.862.722-2.975.117-1.113.178-2.366.178-3.688 0-1.322-.16-2.573-.479-3.768-.317-1.195-.843-2.38-1.568-3.535-.725-1.155-1.55-2.31-2.4-3.476-1.85-1.166-3.7-2.328-5.55-3.282-1.848-.954-3.698-1.81-5.548-2.668-1.85-.858-3.708-1.618-5.56-2.398-1.851-.78-3.698-1.54-5.548-2.328-1.85-.78-3.708-1.54-5.548-2.328-1.85-0.858-3.708-1.618-5.548-2.398-1.851-.78-3.698-1.54-5.548-2.328-1.85-0.858-3.708-1.618-5.548-2.398-1.85-0.858-3.708-1.618-5.548-2.328-1.85-0.858-3.708-1.618-5.548-2.398-1.851-.78-3.698-1.54-5.548-2.328-1.85-0.858-3.708-1.618-5.548-2.398-1.85-0.858-3.708-1.618-5.548-2.328-1.85-0.858-3.708-1.618-5.548-2.398"></path></svg></a>`;
    const out = replaceCanonicalSocialSvgInAnchors(html);
    expect(out).toContain('href="https://t.me/foo"');
    expect(out).toContain('aria-label="Telegram"');
    expect(out).toContain('class="social-icons"');
    expect(out).toContain("11.944 0A12 12");
    expect(out.length).toBeLessThan(html.length);
  });

  it("не трогает обычные внешние ссылки с SVG", () => {
    const html = `<a href="https://example.com/"><svg><path d="M1 1"/></svg></a>`;
    expect(replaceCanonicalSocialSvgInAnchors(html)).toBe(html);
  });

  it("подменяет SVG в ссылке LinkedIn на канонический", () => {
    const html = `<a href="https://www.linkedin.com/in/foo" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></a>`;
    const out = replaceCanonicalSocialSvgInAnchors(html);
    expect(out).toContain('href="https://www.linkedin.com/in/foo"');
    expect(out).toContain("20.447 20.452");
    expect(out).toContain('class="social-icons"');
  });
});

describe("normalizeLayoutWidths", () => {
  it("заменяет max-width: 70rem на ширину контента лендинга", () => {
    const out = normalizeLayoutWidths("<style>.c{max-width:70rem}</style>");
    expect(out).toContain("var(--landing-content-max)");
    expect(out).not.toMatch(/70rem/);
  });
});

describe("enhanceLandingHtml", () => {
  it("подменяет узкий max-width из стилей модели перед инжектом", () => {
    const html = `<!DOCTYPE html><html><head><style>.container{max-width:70rem;margin:0 auto}</style></head><body><p>x</p></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toMatch(/var\(--landing-content-max\)/);
    expect(out).toContain("--landing-content-max:");
    expect(out).not.toMatch(/max-width:\s*70rem/i);
  });

  it("вставляет скрипт перед </body>", () => {
    const html = "<!DOCTYPE html><html><head></head><body><p>x</p></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).toContain("data-landing-anchor-fix");
    expect(out).toContain("data-landing-footer-fix");
    expect(out).toContain("data-landing-contact-fix");
    expect(out).toContain("data-landing-contrast-fix");
    expect(out).toContain("data-landing-lead-align-fix");
    expect(out).toContain("data-landing-layout-fix");
    expect(out).toContain("data-landing-structure-fix");
    expect(out).toContain("header {");
    expect(out).toContain("scrollIntoView");
  });

  it("не дублирует скрипт", () => {
    const once = enhanceLandingHtml("<html><body></body></html>");
    const twice = enhanceLandingHtml(once);
    expect((twice.match(/data-landing-anchor-fix/g) || []).length).toBe(1);
  });

  it("разводит одинаковые /image? по слотам v=1, v=2…", () => {
    const html = `<!DOCTYPE html><html><head></head><body>
<img src="/image?prompt=one&w=1024&h=768" alt="a">
<img src="/image?prompt=one&w=1024&h=768" alt="b">
<img src="/image?prompt=one&w=1024&h=768" alt="c">
</body></html>`;
    const out = enhanceLandingHtml(html, undefined, { skipVisualEnrichment: true });
    const srcMatches = [...out.matchAll(/\ssrc="(\/image\?[^"]+)"/g)].map((m) => m[1]);
    expect(srcMatches.length).toBeGreaterThanOrEqual(3);
    expect(srcMatches.filter((s) => !/[?&]v=\d+/.test(s)).length).toBe(1);
    expect(srcMatches.some((s) => s.includes("v=1"))).toBe(true);
    expect(srcMatches.some((s) => s.includes("v=2"))).toBe(true);
    expect(srcMatches.every((s) => /[?&]sid=\d+/.test(s))).toBe(true);
  });

  it("переписывает внутренние ссылки в якоря текущей страницы", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <nav><a href="/about">О нас</a><a href="services">Услуги</a></nav>
          <section id="about"></section>
          <section id="services"></section>
        </body>
      </html>
    `;
    const out = enhanceLandingHtml(html);
    expect(out).toContain('href="#about"');
    expect(out).toContain('href="#services"');
  });

  it("не трогает внешние и служебные ссылки", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <a href="https://example.com">ext</a>
          <a href="mailto:test@example.com">mail</a>
          <a href="tel:+123">tel</a>
          <section id="about"></section>
        </body>
      </html>
    `;
    const out = enhanceLandingHtml(html);
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('href="mailto:test@example.com"');
    expect(out).toContain('href="tel:+123"');
  });

  it("внедряет защиту от перехода по относительным ссылкам в SPA-хост", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <a href="/">Главная</a>
          <a href="/about">О нас</a>
          <section id="contact"></section>
        </body>
      </html>
    `;
    const out = enhanceLandingHtml(html);
    expect(out).toContain("closest(\"a[href]\")");
    expect(out).toContain("fallbackIds");
    expect(out).toContain("e.preventDefault()");
  });

  it("проставляет src/alt для пустых img", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <img src="" alt="">
          <img data-src="https://example.com/a.jpg">
          <img>
        </body>
      </html>
    `;
    const out = enhanceLandingHtml(html);
    expect(out).not.toContain('src=""');
    expect(out).toContain('src="https://example.com/a.jpg"');
    expect(out).toContain('alt="Section image"');
  });

  it("заменяет пустые background-image url() на fallback", () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <section style="background-image:url('');"></section>
        </body>
      </html>
    `;
    const out = enhanceLandingHtml(html);
    expect(out).not.toContain("url('')");
    expect(out).toContain("background-image:none");
  });

  it("добавляет контактный якорь в footer при его отсутствии", () => {
    const html = "<html><body><footer>Контакты</footer></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).toContain('id="contact"');
  });

  it("добавляет hero-image в header без картинки", () => {
    const html = "<html><body><header><h1>x</h1></header><main><section>content</section></main></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).toContain("data-landing-hero-image");
    expect(out).toMatch(/\/image\?prompt=/);
  });

  it("добавляет блок визуалов если картинок меньше трёх", () => {
    const html = "<html><body><main><section>content</section></main></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).toContain('data-landing-visuals="1"');
    expect((out.match(/\/image\?prompt=/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("по skipVisualEnrichment не вставляет hero и галерею", () => {
    const html = "<html><body><header><h1>x</h1></header></body></html>";
    const out = enhanceLandingHtml(html, undefined, { skipVisualEnrichment: true });
    expect(out).not.toMatch(/<div[^>]*\bdata-landing-hero-image\s*=/i);
    expect(out).not.toContain('<section data-landing-visuals="1"');
  });

  it("layoutMode minimal вставляет облегчённый structure style", () => {
    const html = "<!DOCTYPE html><html><head></head><body><p>x</p></body></html>";
    const out = enhanceLandingHtml(html, undefined, { layoutMode: "minimal" });
    expect(out).toContain("data-landing-structure-fix");
    expect(out).toContain("main section + section");
  });

  it("не добавляет вторую форму, если форма уже есть", () => {
    const html = "<html><body><form><input name='name' /></form><footer>x</footer></body></html>";
    const out = enhanceLandingHtml(html);
    expect((out.match(/<form\b/gi) || []).length).toBe(1);
  });

  it("не дублирует универсальную форму и стили при повторной обработке", () => {
    const once = enhanceLandingHtml("<html><body><footer>f</footer></body></html>");
    const twice = enhanceLandingHtml(once);
    expect((twice.match(/id="lead-form"/g) || []).length).toBe(0);
    expect((twice.match(/data-landing-lead-form-fix/g) || []).length).toBe(1);
  });

  it("заменяет #services на существующую секцию, если services нет", () => {
    const html = `<!DOCTYPE html><html><body><a href="#services">x</a><section id="gallery"></section></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toContain('href="#gallery"');
  });

  it("оборачивает подписку по email в footer в form", () => {
    const html = `<html><body><footer><label for="e">e</label><input type="email" id="e"></footer></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toContain('id="newsletter-form"');
  });

  it("по умолчанию не заменяет Unsplash на /image", () => {
    vi.unstubAllEnvs();
    delete process.env.LANDING_REPLACE_STOCK_WITH_AI;
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><img src="https://images.unsplash.com/photo-1?w=100" alt="rose"></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toMatch(/<img[^>]*src="https:\/\/images\.unsplash\.com\/photo-1[^"]*"/);
    const fromStock = (out.match(/<img[^>]*src="https:\/\/images\.unsplash\.com\/photo-1[^"]*"[^>]*>/gi) || []).length;
    expect(fromStock).toBeGreaterThanOrEqual(1);
  });

  it("по LANDING_REPLACE_STOCK_WITH_AI=true переписывает stock в /image", () => {
    vi.stubEnv("LANDING_REPLACE_STOCK_WITH_AI", "true");
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><img src="https://images.unsplash.com/photo-1?w=100" alt="rose"></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toMatch(/\/image\?/);
    vi.unstubAllEnvs();
  });
});
