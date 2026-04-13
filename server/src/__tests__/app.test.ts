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
      expect(res.body.error).toBe("prompt is required");
    });

    it("400 при пустом prompt", async () => {
      const res = await request(app).post("/generate").send({ prompt: "   " }).expect(400);
      expect(res.body.error).toBe("prompt is required");
    });

    it("502 при ошибке генерации", async () => {
      mockedGenerate.mockRejectedValueOnce(new Error("LLM down"));
      const res = await request(app).post("/generate").send({ prompt: "тест" }).expect(502);
      expect(res.body.error).toBe("LLM down");
    });

    it("200 и JSON при успехе", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      const res = await request(app)
        .post("/generate")
        .send({ prompt: "стоматология", locale: "ru" })
        .expect(200);
      expect(res.body).toEqual(validLandingData);
      expect(mockedGenerate).toHaveBeenCalledWith("стоматология", "ru", {});
    });

    it("передаёт generateMode в generateLandingContent", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      await request(app)
        .post("/generate")
        .send({ prompt: "тест", locale: "ru", generateMode: "template" })
        .expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith("тест", "ru", { generateMode: "template" });
    });

    it("невалидный locale даёт en только если en, иначе ru", async () => {
      mockedGenerate.mockResolvedValueOnce(validLandingData);
      await request(app).post("/generate").send({ prompt: "x", locale: "xx" }).expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith("x", "ru", {});

      mockedGenerate.mockResolvedValueOnce({ ...validLandingData, locale: "en" });
      await request(app).post("/generate").send({ prompt: "y", locale: "en" }).expect(200);
      expect(mockedGenerate).toHaveBeenCalledWith("y", "en", {});
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
