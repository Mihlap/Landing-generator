import type { Request, Response } from "express";
import { Router } from "express";
import { isPaymentSucceededForExport } from "../services/yookassa.js";
import { renderTemplate } from "../services/template.js";
import { isLandingData } from "../validation.js";

const router = Router();

function allowMockPaidExport(): boolean {
  return (
    process.env.NODE_ENV === "test" || process.env.ALLOW_EXPORT_MOCK_PAID === "true"
  );
}

router.post("/", async (req: Request, res: Response) => {
  const data = req.body?.data;
  const mockFlag = req.body?.paid === true || req.headers["x-export-paid"] === "true";
  const paymentId =
    typeof req.body?.paymentId === "string" ? req.body.paymentId.trim() : "";

  if (!isLandingData(data)) {
    res.status(400).json({ error: "invalid data payload" });
    return;
  }

  let paid = false;
  if (allowMockPaidExport() && mockFlag) {
    paid = true;
  } else if (paymentId) {
    paid = await isPaymentSucceededForExport(paymentId);
  }

  if (!paid) {
    res.status(402).json({
      error: "Payment required",
      message:
        "Экспорт HTML доступен после оплаты через ЮKassa. После успешной оплаты скачивание откроется автоматически. Для локальной отладки задайте ALLOW_EXPORT_MOCK_PAID=true.",
    });
    return;
  }

  const html =
    typeof data.generatedHtml === "string" && data.generatedHtml.trim().length > 0
      ? data.generatedHtml
      : renderTemplate(data.templateId, data);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="landing.html"');
  res.send(html);
});

export default router;
