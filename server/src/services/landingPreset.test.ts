import { describe, expect, it } from "vitest";
import { validLandingData } from "../testFixtures.js";
import { applyPreset, isLandingPreset } from "./landingPreset.js";

describe("landingPreset", () => {
  it("распознает валидные пресеты", () => {
    expect(isLandingPreset("sales")).toBe(true);
    expect(isLandingPreset("minimal")).toBe(true);
    expect(isLandingPreset("premium")).toBe(true);
    expect(isLandingPreset("trust-first")).toBe(true);
    expect(isLandingPreset("other")).toBe(false);
  });

  it("применяет minimal детерминированно", () => {
    const a = applyPreset(validLandingData, "minimal");
    const b = applyPreset(validLandingData, "minimal");
    expect(a).toEqual(b);
    expect(a.cta.length).toBeGreaterThan(0);
    expect(a.sections?.[0]).toBe("hero");
    expect(a.sections?.[a.sections.length - 1]).toBe("footer");
  });

  it("для sales выставляет вариативность hero/services/reviews", () => {
    const out = applyPreset(validLandingData, "sales");
    expect(out.sectionVariants?.hero).toBe("b");
    expect(out.sectionVariants?.services).toBe("b");
    expect(out.sectionVariants?.reviews).toBe("b");
  });
});

