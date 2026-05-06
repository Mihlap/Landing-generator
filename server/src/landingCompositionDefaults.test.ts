import { describe, expect, it } from "vitest";
import { getLandingCompositionDefaults } from "./landingCompositionDefaults.js";
import type { TemplateId } from "./templateId.js";

describe("landingCompositionDefaults", () => {
  it("задает разные структуры секций для разных бизнесов", () => {
    const ids: TemplateId[] = ["dental", "auto", "repair", "realestate", "ecommerce"];
    const orders = ids.map((id) => getLandingCompositionDefaults(id, "ru").sections);
    const uniqueOrders = new Set(orders.map((sections) => sections.join("|")));
    expect(uniqueOrders.size).toBe(ids.length);
  });

  it("в каждой структуре hero первая, footer последняя", () => {
    const ids: TemplateId[] = ["dental", "auto", "repair", "realestate", "ecommerce"];
    for (const id of ids) {
      const sections = getLandingCompositionDefaults(id, "en").sections;
      expect(sections[0]).toBe("hero");
      expect(sections[sections.length - 1]).toBe("footer");
    }
  });
});
