import { describe, expect, it, vi } from "vitest";
import { enhanceLandingHtml, normalizeLayoutWidths } from "./landingHtmlPostprocess.js";

describe("normalizeLayoutWidths", () => {
  it("заменяет max-width: 70rem на ширину контента лендинга", () => {
    const out = normalizeLayoutWidths("<style>.c{max-width:70rem}</style>");
    expect(out).toContain("118rem");
    expect(out).not.toMatch(/70rem/);
  });
});

describe("enhanceLandingHtml", () => {
  it("подменяет узкий max-width из стилей модели перед инжектом", () => {
    const html = `<!DOCTYPE html><html><head><style>.container{max-width:70rem;margin:0 auto}</style></head><body><p>x</p></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toMatch(/118rem/);
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

  it("не добавляет hero-image автоматически, если изображений нет", () => {
    const html = "<html><body><header><h1>x</h1></header><main><section>content</section></main></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).not.toContain('<section data-landing-hero-image="1"');
  });

  it("не добавляет автогенерируемый блок визуалов", () => {
    const html = "<html><body><main><section>content</section></main></body></html>";
    const out = enhanceLandingHtml(html);
    expect(out).not.toContain('<section data-landing-visuals="1"');
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
    expect(out).toContain("images.unsplash.com");
    expect(out).not.toMatch(/src="\/image\?/);
  });

  it("по LANDING_REPLACE_STOCK_WITH_AI=true переписывает stock в /image", () => {
    vi.stubEnv("LANDING_REPLACE_STOCK_WITH_AI", "true");
    const html = `<!DOCTYPE html><html><head><title>T</title></head><body><img src="https://images.unsplash.com/photo-1?w=100" alt="rose"></body></html>`;
    const out = enhanceLandingHtml(html);
    expect(out).toMatch(/\/image\?/);
    vi.unstubAllEnvs();
  });
});
