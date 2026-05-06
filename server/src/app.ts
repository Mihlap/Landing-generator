import cors from "cors";
import express from "express";
import { randomUUID } from "crypto";
import exportRouter from "./routes/export.js";
import generateRouter from "./routes/generate.js";
import imageRouter from "./routes/image.js";
import paymentRouter from "./routes/payment.js";
import previewRouter from "./routes/preview.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use((req, res, next) => {
    const inbound = req.header("x-request-id");
    const requestId = typeof inbound === "string" && inbound.trim() ? inbound.trim().slice(0, 120) : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/generate", generateRouter);
  app.use("/export", exportRouter);
  app.use("/preview", previewRouter);
  app.use("/image", imageRouter);
  app.use("/payments", paymentRouter);

  return app;
}
