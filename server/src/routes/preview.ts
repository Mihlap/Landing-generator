import type { Request, Response } from "express";
import { Router } from "express";
import { renderTemplate } from "../services/template.js";
import { applyPreset } from "../services/landingPreset.js";
import { isLandingData, isLandingPresetMode } from "../validation.js";

const router = Router();

function presetsEnabled(): boolean {
  return process.env.ENABLE_LANDING_PRESETS?.trim().toLowerCase() === "true";
}

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

router.post("/preset", (req: Request, res: Response) => {
  if (!presetsEnabled()) {
    res.status(404).json({ error: "presets are disabled" });
    return;
  }

  const data = req.body?.data;
  const preset = req.body?.preset;
  if (!isLandingData(data)) {
    res.status(400).json({ error: "invalid data payload" });
    return;
  }
  if (!isLandingPresetMode(preset)) {
    res.status(400).json({ error: "invalid preset" });
    return;
  }

  const updated = applyPreset(data, preset);
  const html =
    typeof updated.generatedHtml === "string" && updated.generatedHtml.trim().length > 0
      ? updated.generatedHtml
      : renderTemplate(updated.templateId, updated);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({ data: updated, html });
});

export default router;
