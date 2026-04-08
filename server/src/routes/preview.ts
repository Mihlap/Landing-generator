import type { Request, Response } from "express";
import { Router } from "express";
import { renderTemplate } from "../services/template.js";
import { isLandingData } from "../validation.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const data = req.body?.data;

  if (!isLandingData(data)) {
    res.status(400).json({ error: "invalid data payload" });
    return;
  }

  const html =
    typeof data.generatedHtml === "string" && data.generatedHtml.trim().length > 0
      ? data.generatedHtml
      : renderTemplate(data.templateId, data);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
