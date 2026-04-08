import type { LandingData } from "./ai.js";
import type { TemplateId } from "../templateId.js";
import { renderLandingHtml } from "../landingSections.js";

export type { TemplateId } from "../templateId.js";

export function renderTemplate(templateId: TemplateId, data: LandingData): string {
  return renderLandingHtml({ ...data, templateId: data.templateId ?? templateId });
}
