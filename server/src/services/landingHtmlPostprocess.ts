import {
  ANCHOR_MARKER,
  CONTACT_MARKER,
  CONTRAST_MARKER,
  FOOTER_MARKER,
  IMAGE_RETRY_MARKER,
  LAYOUT_MARKER,
  LEAD_ALIGN_MARKER,
  LEAD_FORM_MARKER,
  STRUCTURE_MARKER,
} from "./landingHtmlPostprocessMarkers.js";
import type { EnhanceLandingHtmlOptions, LandingLayoutMode } from "./landingHtmlPostprocessTypes.js";
import { LANDING_CONTENT_WIDTH } from "./landingHtmlPostprocessTypes.js";
export type { EnhanceLandingHtmlOptions, ImagePreference, LandingLayoutMode } from "./landingHtmlPostprocessTypes.js";
export { LANDING_CONTENT_WIDTH } from "./landingHtmlPostprocessTypes.js";

import { replaceCanonicalSocialSvgInAnchors } from "./landingHtmlPostprocessSocial.js";
export { replaceCanonicalSocialSvgInAnchors } from "./landingHtmlPostprocessSocial.js";

import {
  ANCHOR_SCRIPT,
  CONTACT_SCRIPT,
  CONTRAST_SCRIPT,
  IMAGE_RETRY_SCRIPT,
  LEAD_ALIGN_SCRIPT,
} from "./landingHtmlPostprocessScripts.js";
import { FOOTER_STYLE, LAYOUT_STYLE, LEAD_FORM_STYLE, structureStyleForMode } from "./landingHtmlPostprocessStyles.js";
import {
  appendLandingSidToLocalImages,
  assignVariationSlotsToLocalImages,
  computeLandingImageSeed,
  FALLBACK_IMAGE_SRC,
  replaceStockImagesWithAi,
  shouldReplaceStockWithAi,
} from "./landingHtmlPostprocessImageUrl.js";
import {
  ensureAtLeastOneHeroImage,
  ensureBackgroundImagesHaveSource,
  ensureContactSectionAnchors,
  ensureFooterNewsletterForm,
  ensureImageTagsHaveSource,
  ensureLeadForm,
  ensureVisualCoverage,
  fillEmptyImagePlaceholders,
  fixIncompleteSectionAnchors,
  normalizeHeroHeadingSurface,
  rewriteInternalLinksToAnchors,
  sanitizeInlineCssDataUrls,
  stripUnsafeHrefs,
} from "./landingHtmlPostprocessMutations.js";

export function normalizeLayoutWidths(html: string): string {
  const W = LANDING_CONTENT_WIDTH;
  return html
    .replace(/max-width\s*:\s*7[0-2](?:\.\d+)?rem\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*11[0-9]{2}px\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*1200px\b/gi, `max-width: ${W}`)
    .replace(/max-width\s*:\s*1140px\b/gi, `max-width: ${W}`)
    .replace(/min\s*\(\s*7[0-2]rem\s*,/gi, "min(80rem,");
}

export function effectiveLayoutMode(explicit?: LandingLayoutMode): LandingLayoutMode {
  if (explicit === "minimal" || explicit === "full") return explicit;
  const env = process.env.LANDING_LAYOUT_MODE?.trim().toLowerCase();
  return env === "minimal" ? "minimal" : "full";
}

export function enhanceLandingHtml(
  html: string,
  fallbackImageSrc: string = FALLBACK_IMAGE_SRC,
  options?: EnhanceLandingHtmlOptions,
): string {
  const layoutMode = effectiveLayoutMode(options?.layoutMode);
  const imagePreference = options?.imagePreference;
  const skipVisual = options?.skipVisualEnrichment === true;
  const landingSeed = computeLandingImageSeed(html);

  const withLayoutWidths = normalizeLayoutWidths(replaceCanonicalSocialSvgInAnchors(stripUnsafeHrefs(html)));
  const withSanitizedCssDataUrls = sanitizeInlineCssDataUrls(withLayoutWidths);
  const withSafeBgImages = ensureBackgroundImagesHaveSource(withSanitizedCssDataUrls);
  const withSafeImages = ensureImageTagsHaveSource(withSafeBgImages);
  const withFixedSectionAnchors = fixIncompleteSectionAnchors(withSafeImages);
  const withContactAnchors = ensureContactSectionAnchors(withFixedSectionAnchors);
  const withNewsletterForm = ensureFooterNewsletterForm(withContactAnchors);
  const withImagePlaceholders = fillEmptyImagePlaceholders(withNewsletterForm);
  const withHeroTitleFix = normalizeHeroHeadingSurface(withImagePlaceholders);
  const withHeroImage = skipVisual
    ? withHeroTitleFix
    : ensureAtLeastOneHeroImage(withHeroTitleFix, fallbackImageSrc, imagePreference);
  const withAiImages = shouldReplaceStockWithAi()
    ? replaceStockImagesWithAi(withHeroImage, imagePreference)
    : withHeroImage;
  const withVisualCoverage = skipVisual ? withAiImages : ensureVisualCoverage(withAiImages, imagePreference);
  const withImageSlots = assignVariationSlotsToLocalImages(withVisualCoverage);
  const withLandingSid = appendLandingSidToLocalImages(withImageSlots, landingSeed);
  const withLeadForm = ensureLeadForm(withLandingSid);
  const normalizedLinks = rewriteInternalLinksToAnchors(withLeadForm);
  const trimmed = normalizedLinks.trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.includes(`${ANCHOR_MARKER}="1"`) &&
    trimmed.includes(`${FOOTER_MARKER}="1"`) &&
    trimmed.includes(`${LEAD_FORM_MARKER}="1"`) &&
    trimmed.includes(`${CONTACT_MARKER}="1"`) &&
    trimmed.includes(`${CONTRAST_MARKER}="1"`) &&
    trimmed.includes(`${LEAD_ALIGN_MARKER}="1"`) &&
    trimmed.includes(`${IMAGE_RETRY_MARKER}="1"`) &&
    trimmed.includes(`${LAYOUT_MARKER}="1"`) &&
    trimmed.includes(`${STRUCTURE_MARKER}="1"`)
  ) {
    return trimmed;
  }

  const injections = [
    !trimmed.includes(`${FOOTER_MARKER}="1"`) ? FOOTER_STYLE : "",
    !trimmed.includes(`${LAYOUT_MARKER}="1"`) ? LAYOUT_STYLE : "",
    !trimmed.includes(`${STRUCTURE_MARKER}="1"`) ? structureStyleForMode(layoutMode) : "",
    !trimmed.includes(`${LEAD_FORM_MARKER}="1"`) ? LEAD_FORM_STYLE : "",
    !trimmed.includes(`${ANCHOR_MARKER}="1"`) ? ANCHOR_SCRIPT : "",
    !trimmed.includes(`${CONTACT_MARKER}="1"`) ? CONTACT_SCRIPT : "",
    !trimmed.includes(`${CONTRAST_MARKER}="1"`) ? CONTRAST_SCRIPT : "",
    !trimmed.includes(`${LEAD_ALIGN_MARKER}="1"`) ? LEAD_ALIGN_SCRIPT : "",
    !trimmed.includes(`${IMAGE_RETRY_MARKER}="1"`) ? IMAGE_RETRY_SCRIPT : "",
  ]
    .filter(Boolean)
    .join("");

  if (/<\/body\s*>/i.test(trimmed)) {
    return trimmed.replace(/<\/body\s*>/i, `${injections}</body>`);
  }
  if (/<\/html\s*>/i.test(trimmed)) {
    return trimmed.replace(/<\/html\s*>/i, `${injections}</html>`);
  }
  return `${trimmed}\n${injections}`;
}
