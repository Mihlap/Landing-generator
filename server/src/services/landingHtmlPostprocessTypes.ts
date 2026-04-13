export type LandingLayoutMode = "full" | "minimal";
export type ImagePreference = "stock_first" | "gen_first" | "balanced";

export type EnhanceLandingHtmlOptions = {
  layoutMode?: LandingLayoutMode;
  imagePreference?: ImagePreference;
  skipVisualEnrichment?: boolean;
};

export const LANDING_CONTENT_WIDTH = "var(--landing-content-max)";
