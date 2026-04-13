import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("gigachat", () => ({
  default: class MockGigaChat {
    chat = vi.fn().mockResolvedValue({
      choices: [{ message: { content: '{"templateId":"auto","title":"T","subtitle":"S","services":["a"],"reviews":[],"cta":"c"}' } }],
    });
  },
}));

import { resolveLlmProvider, runLlmCompletion, runLlmLandingHtml } from "./llm.js";

describe("resolveLlmProvider", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("возвращает gigachat при AI_PROVIDER=gigachat и непустом GIGACHAT_CREDENTIALS", () => {
    vi.stubEnv("AI_PROVIDER", "gigachat");
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdGNyZWRz");
    expect(resolveLlmProvider()).toBe("gigachat");
  });

  it("возвращает none при AI_PROVIDER=gigachat без GIGACHAT_CREDENTIALS", () => {
    vi.stubEnv("AI_PROVIDER", "gigachat");
    vi.stubEnv("GIGACHAT_CREDENTIALS", "");
    expect(resolveLlmProvider()).toBe("none");
  });

  it("без AI_PROVIDER выбирает gigachat, если задан только GIGACHAT_CREDENTIALS", () => {
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdA==");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    expect(resolveLlmProvider()).toBe("gigachat");
  });

  it("без AI_PROVIDER при ключах GigaChat и Z.AI выбирает gigachat", () => {
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdA==");
    vi.stubEnv("AI_ZZZ", "zai-key-test");
    expect(resolveLlmProvider()).toBe("gigachat");
  });

  it("при AI_PROVIDER=openai возвращает openai при наличии ключа", () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdA==");
    expect(resolveLlmProvider()).toBe("openai");
  });

  it("при AI_PROVIDER=yandex возвращает yandex при наличии folder и IAM", () => {
    vi.stubEnv("AI_PROVIDER", "yandex");
    vi.stubEnv("YANDEX_CLOUD_FOLDER_ID", "b1xxx");
    vi.stubEnv("YANDEX_IAM_TOKEN", "t1");
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdA==");
    expect(resolveLlmProvider()).toBe("yandex");
  });
});

describe("runLlmCompletion + GigaChat", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("при provider=gigachat возвращает текст ответа модели (мок SDK)", async () => {
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdGNyZWRz");
    vi.stubEnv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS");

    const text = await runLlmCompletion("gigachat", "system prompt", "user prompt");
    expect(text).toContain("templateId");
    expect(text).toContain("auto");
  });
});

describe("runLlmLandingHtml", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("вызывает GigaChat с увеличенным ответом (мок)", async () => {
    vi.stubEnv("GIGACHAT_CREDENTIALS", "dGVzdGNyZWRz");
    vi.stubEnv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS");

    const text = await runLlmLandingHtml("gigachat", "sys", "user");
    expect(text).toContain("templateId");
  });
});
