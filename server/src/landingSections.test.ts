import { describe, expect, it } from "vitest";
import { normalizeSectionOrder } from "./landingSections.js";

describe("normalizeSectionOrder", () => {
  it("ставит hero в начало и footer в конец", () => {
    expect(normalizeSectionOrder(["reviews", "hero", "cta"])).toEqual([
      "hero",
      "reviews",
      "cta",
      "footer",
    ]);
  });

  it("использует полный список по умолчанию", () => {
    const o = normalizeSectionOrder(undefined);
    expect(o[0]).toBe("hero");
    expect(o[o.length - 1]).toBe("footer");
    expect(o.length).toBe(9);
  });
});
