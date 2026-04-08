import type { Request, Response } from "express";
import { Router } from "express";
import {
  createRedirectPayment,
  fetchPaymentStatus,
  getClientPublicUrl,
  getExportPriceRub,
  getYooKassaCredentials,
} from "../services/yookassa.js";

const router = Router();

router.get("/info", (_req: Request, res: Response) => {
  res.json({
    provider: "yookassa",
    amountRub: getExportPriceRub(),
    currency: "RUB",
    configured: getYooKassaCredentials() !== null,
  });
});

router.post("/webhook", async (req: Request, res: Response) => {
  const body = req.body as { type?: string; event?: string; object?: { id?: string } };
  const paymentId = typeof body.object?.id === "string" ? body.object.id : "";

  if (paymentId && (body.event === "payment.succeeded" || body.type === "notification")) {
    await fetchPaymentStatus(paymentId);
  }

  res.status(200).send();
});

router.post("/", async (req: Request, res: Response) => {
  if (!getYooKassaCredentials()) {
    res.status(503).json({
      error: "payments_unavailable",
      message: "ЮKassa не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY.",
    });
    return;
  }

  const base = getClientPublicUrl();
  const returnUrl = `${base}/editor`;

  try {
    const { id, confirmationUrl } = await createRedirectPayment({
      returnUrl,
      description: "Экспорт HTML (AutoPage AI)",
    });
    res.json({ paymentId: id, confirmationUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "payment_create_failed";
    res.status(502).json({ error: "payment_create_failed", message: msg });
  }
});

router.get("/:id/status", async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ error: "payment_id_required" });
    return;
  }
  if (!getYooKassaCredentials()) {
    res.status(503).json({ error: "payments_unavailable" });
    return;
  }

  const p = await fetchPaymentStatus(id);
  if (!p) {
    res.status(404).json({ error: "payment_not_found" });
    return;
  }

  res.json({
    paymentId: p.id,
    status: p.status,
    paid: p.paid,
    exportAllowed: p.paid === true && p.status === "succeeded",
  });
});

export default router;
