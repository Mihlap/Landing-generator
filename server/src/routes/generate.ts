import type { Request, Response } from "express";
import { Router } from "express";
import { sendApiError } from "../services/apiError.js";
import { generateLandingContent, type SiteLocale } from "../services/ai.js";
import { isLandingGenerateMode, isLandingLayoutMode, isSiteLocale } from "../validation.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    sendApiError(res, 400, "PROMPT_REQUIRED", "prompt is required", false);
    return;
  }
  const rawLocale = req.body?.locale;
  const locale: SiteLocale = isSiteLocale(rawLocale) ? rawLocale : "ru";
  const layoutMode = isLandingLayoutMode(req.body?.layoutMode) ? req.body.layoutMode : undefined;
  const generateMode = isLandingGenerateMode(req.body?.generateMode) ? req.body.generateMode : undefined;
  const abortController = new AbortController();
  const abortGeneration = () => abortController.abort();
  req.on("aborted", abortGeneration);
  try {
    const data = await generateLandingContent(prompt, locale, {
      ...(layoutMode ? { layoutMode } : {}),
      ...(generateMode ? { generateMode } : {}),
      signal: abortController.signal,
    });
    if (abortController.signal.aborted) return;
    res.json(data);
  } catch (e) {
    if (abortController.signal.aborted) return;
    const message = e instanceof Error ? e.message : "Generation failed";
    sendApiError(res, 502, "GENERATION_FAILED", message, true);
  } finally {
    req.off("aborted", abortGeneration);
  }
});

export default router;
