import { afterEach, describe, expect, it, vi } from "vitest";
import { landingBuildMode } from "./ai.js";

describe("landingBuildMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("по умолчанию для gigachat — html", () => {
    expect(landingBuildMode("gigachat")).toBe("html");
  });

  it("для openai/yandex — template", () => {
    expect(landingBuildMode("openai")).toBe("template");
    expect(landingBuildMode("yandex")).toBe("template");
  });

  it("LANDING_BUILD_MODE=template принудительно для gigachat", () => {
    vi.stubEnv("LANDING_BUILD_MODE", "template");
    expect(landingBuildMode("gigachat")).toBe("template");
  });

  it("LANDING_BUILD_MODE=html для openai", () => {
    vi.stubEnv("LANDING_BUILD_MODE", "html");
    expect(landingBuildMode("openai")).toBe("html");
  });
});
