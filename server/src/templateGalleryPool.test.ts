import { describe, expect, it } from "vitest";
import { buildTemplateGalleryPool } from "./templateGalleryPool.js";

describe("buildTemplateGalleryPool", () => {
  it("даёт /image с prefer=stock и разными промптами по вертикали", () => {
    const pool = buildTemplateGalleryPool("repair", "ru", "ремонт стиральных машин", false);
    expect(pool).toHaveLength(4);
    for (const item of pool) {
      expect(item.src).toMatch(/^\/image\?/);
      expect(item.src).toContain("prefer=stock");
      expect(item.src).toContain("w=520");
      expect(item.src).toContain("h=390");
      expect(item.altRu.length).toBeGreaterThan(0);
    }
    const prompts = pool.map((p) => new URLSearchParams(p.src.split("?")[1]!).get("prompt"));
    expect(new Set(prompts).size).toBe(4);
  });

  it("для салона красоты использует отдельный набор сидов", () => {
    const pool = buildTemplateGalleryPool("repair", "en", "hair salon", true);
    expect(pool[0]!.src).toContain(encodeURIComponent("hair salon interior"));
    expect(pool[0]!.altEn).toBe("Salon interior");
  });
});
