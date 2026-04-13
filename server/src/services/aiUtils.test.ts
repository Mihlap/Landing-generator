import { describe, expect, it } from "vitest";
import { extractHtmlFromModelOutput, sliceOuterHtmlDocument } from "./aiUtils.js";

describe("sliceOuterHtmlDocument", () => {
  it("отбрасывает markdown и текст после </html>", () => {
    const doc = "<!DOCTYPE html><html><body>x</body></html>";
    const junk = `\n\n# Описание блоков:\n\n## Хиро\nтекст`;
    expect(sliceOuterHtmlDocument(`${doc}${junk}`)).toBe(doc);
  });

  it("отбрасывает преамбулу до <!DOCTYPE", () => {
    const doc = "<!DOCTYPE html><html><head></head><body></body></html>";
    expect(sliceOuterHtmlDocument(`Сгенерированный код:\n\n${doc}`)).toBe(doc);
  });

  it("работает с <html без doctype", () => {
    const doc = "<html><body>z</body></html>";
    expect(sliceOuterHtmlDocument(`ввод\n${doc}\n## хвост`)).toBe(doc);
  });
});

describe("extractHtmlFromModelOutput", () => {
  it("из fenced-блока берёт только HTML без хвоста за пределами документа", () => {
    const inner = "<!DOCTYPE html><html><body>a</body></html>";
    const raw = `\`\`\`html\n${inner}\n\n# Описание\n\`\`\`\nещё текст`;
    expect(extractHtmlFromModelOutput(raw)).toBe(inner);
  });

  it("без закрывающих ``` обрезает по последнему </html>", () => {
    const inner = "<!DOCTYPE html><html><body></body></html>";
    const raw = `\`\`\`html\n${inner}\n\n# Описание блоков:\n## Hero\n`;
    expect(extractHtmlFromModelOutput(raw)).toBe(inner);
  });
});
