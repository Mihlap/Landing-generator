import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/ai.js", () => ({
  generateLandingContent: vi.fn(),
}));

import request from "supertest";
import { createApp } from "../app.js";
import * as ai from "../services/ai.js";
import { validLandingData } from "../testFixtures.js";

const app = createApp();
const mockedGenerate = vi.mocked(ai.generateLandingContent);

describe("HTTP API", () => {
  beforeEach(() => {
    mockedGenerate.mockReset();
    delete process.env.ENABLE_LANDING_PRESETS;
    delete process.env.IMAGE_PROVIDER;
  });

  describe("GET /health", () => {
    it("возвращает ok", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toEqual({ ok: true });
    });
  });

  describe("POST /generate", () => {
    it("400 без prompt", async () => {
      const res = await request(app).post("/generate").send({}).expect(400);
      expect(res.body.error.code).toBe("PROMPT_REQUIRED");
      expect(res.body.error.message).toBe("prompt is required");
      expect(res.body.error.retryable).toBe(false);
      expect(typeof res.body.error.requestId).toBe("string");
      expect(res.headers["x-request-id"]).toBe(res.body.error.requestId);
    });

    it("400 при пустом prompt", async () => {
      const res = await request(app).post("/generate").send({ prompt: "   " }).expect(400);
      expect(res.body.error.code).toBe("PROMPT_REQUIRED");
      expect(res.body.error.message).toBe("prompt is required");
    });

    it("502 при ошибке генерации", async () => {
      mockedGenerate.mockRejectedValueOnce(new Error("LLM down"));
      const res = await request(app).post("/generate").send({ prompt: "тест" }).expect(502);
      expect(res.body.error.code).toBe("GENERATION_FAILED");
      expect(res.body.error.message).toBe("LLM down");
      expect(res.body.error.retryable).toBe(true);
    });

    it("200 и JSON при успехе", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      const res = await request(app)
        .post("/generate")
        .send({ prompt: "стоматология", locale: "ru" })
        .expect(200);
      expect(res.body).toEqual(validLandingData);
      expect(mockedGenerate).toHaveBeenCalledWith(
        "стоматология",
        "ru",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it("передаёт generateMode в generateLandingContent", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      await request(app)
        .post("/generate")
        .send({ prompt: "тест", locale: "ru", generateMode: "template" })
        .expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith(
        "тест",
        "ru",
        expect.objectContaining({ generateMode: "template", signal: expect.any(AbortSignal) }),
      );
    });

    it("невалидный locale даёт en только если en, иначе ru", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      await request(app).post("/generate").send({ prompt: "x", locale: "xx" }).expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith(
        "x",
        "ru",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

      mockedGenerate.mockResolvedValueOnce({ ...validLandingData, locale: "en" });
      await request(app).post("/generate").send({ prompt: "y", locale: "en" }).expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith(
        "y",
        "en",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  describe("POST /preview", () => {
    it("400 при невалидном data", async () => {
      const res = await request(app).post("/preview").send({ data: {} }).expect(400);
      expect(res.body.error).toBe("invalid data payload");
    });

    it("200 и text/html при валидных данных", async () => {
      const res = await request(app)
        .post("/preview")
        .send({ data: validLandingData })
        .expect(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain("<!DOCTYPE html>");
    });

    it("отдаёт generatedHtml модели, если поле задано", async () => {
      const custom = "<!DOCTYPE html><html><head><title>AI</title></head><body><p>from-model</p></body></html>";
      const res = await request(app)
        .post("/preview")
        .send({ data: { ...validLandingData, generatedHtml: custom } })
        .expect(200);
      expect(res.text).toContain("from-model");
      expect(res.text).not.toContain(validLandingData.title);
    });
  });

  describe("GET /image", () => {
    it("отдаёт нейтральный fallback как изображение, если AI provider недоступен", async () => {
      process.env.IMAGE_PROVIDER = "off";
      const res = await request(app).get("/image?prompt=лендинг%20риелтора&w=520&h=390").expect(200);
      expect(res.headers["content-type"]).toMatch(/image\/svg\+xml/);
      expect(Buffer.from(res.body).toString("utf8")).toContain("Изображение генерируется");
    });
  });

  describe("POST /preview/preset", () => {
    it("404 если feature-flag выключен", async () => {
      const res = await request(app)
        .post("/preview/preset")
        .send({ data: validLandingData, preset: "sales" })
        .expect(404);
      expect(res.body.error).toBe("presets are disabled");
    });

    it("400 при невалидном preset", async () => {
      process.env.ENABLE_LANDING_PRESETS = "true";
      const res = await request(app)
        .post("/preview/preset")
        .send({ data: validLandingData, preset: "unknown" })
        .expect(400);
      expect(res.body.error).toBe("invalid preset");
    });

    it("200 и json с html при валидном preset", async () => {
      process.env.ENABLE_LANDING_PRESETS = "true";
      const res = await request(app)
        .post("/preview/preset")
        .send({ data: validLandingData, preset: "sales" })
        .expect(200);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body.data).toBeTruthy();
      expect(res.body.data.sections[0]).toBe("hero");
      expect(res.body.html).toContain("<!DOCTYPE html>");
    });
  });

  describe("GET /payments/info", () => {
    it("возвращает провайдера и сумму", async () => {
      const res = await request(app).get("/payments/info").expect(200);
      expect(res.body.provider).toBe("yookassa");
      expect(res.body.currency).toBe("RUB");
      expect(typeof res.body.amountRub).toBe("string");
      expect(typeof res.body.configured).toBe("boolean");
    });
  });

  describe("POST /export", () => {
    it("400 при невалидном data", async () => {
      const res = await request(app)
        .post("/export")
        .send({ data: { title: "only" }, paid: true })
        .expect(400);
      expect(res.body.error).toBe("invalid data payload");
    });

    it("402 без оплаты", async () => {
      const res = await request(app).post("/export").send({ data: validLandingData }).expect(402);
      expect(res.body.error).toBe("Payment required");
    });

    it("200 и attachment при paid: true", async () => {
      const res = await request(app)
        .post("/export")
        .send({ data: validLandingData, paid: true })
        .expect(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.headers["content-disposition"]).toMatch(/attachment/);
      expect(res.text).toContain("<!DOCTYPE html>");
    });

    it("200 при заголовке x-export-paid", async () => {
      await request(app)
        .post("/export")
        .set("x-export-paid", "true")
        .send({ data: validLandingData })
        .expect(200);
    });
  });

  describe("тело не JSON", () => {
    it("generate: некорректный JSON", async () => {
      await request(app)
        .post("/generate")
        .set("Content-Type", "application/json")
        .send("{not json")
        .expect(400);
    });
  });
});
