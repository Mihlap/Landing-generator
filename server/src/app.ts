import cors from "cors";
import express from "express";
import exportRouter from "./routes/export.js";
import generateRouter from "./routes/generate.js";
import paymentRouter from "./routes/payment.js";
import previewRouter from "./routes/preview.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "256kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/generate", generateRouter);
  app.use("/export", exportRouter);
  app.use("/preview", previewRouter);
  app.use("/payments", paymentRouter);

  return app;
}
