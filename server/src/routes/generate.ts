import type { Request, Response } from "express";
import { Router } from "express";
import { generateLandingContent, type SiteLocale } from "../services/ai.js";
import { isLandingLayoutMode, isSiteLocale } from "../validation.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }
  const rawLocale = req.body?.locale;
  const locale: SiteLocale = isSiteLocale(rawLocale) ? rawLocale : "ru";
  const layoutMode = isLandingLayoutMode(req.body?.layoutMode) ? req.body.layoutMode : undefined;
  try {
    const data = await generateLandingContent(prompt, locale, {
      ...(layoutMode ? { layoutMode } : {}),
    });
    res.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    res.status(502).json({ error: message });
  }
});

export default router;
