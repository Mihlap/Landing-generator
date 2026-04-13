export type SiteLocale = "ru" | "en";

export type LandingGenerateMode = "html" | "template";

export type TemplateId = "dental" | "auto" | "repair" | "realestate" | "ecommerce";

export type SectionKind =
  | "hero"
  | "benefits"
  | "services"
  | "gallery"
  | "pricing"
  | "reviews"
  | "process"
  | "faq"
  | "map"
  | "cta"
  | "footer";

export type SkinId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type LandingThemeVarKey =
  | "--lp-page-bg"
  | "--lp-page-fg"
  | "--lp-muted"
  | "--lp-surface"
  | "--lp-surface-alt"
  | "--lp-accent"
  | "--lp-accent-on"
  | "--lp-accent-soft"
  | "--lp-border"
  | "--lp-hero-bg";

export type LandingTheme = {
  variables?: Partial<Record<LandingThemeVarKey, string>>;
  fontFamily?: string;
  fontLinkHref?: string;
};

export type LandingData = {
  title: string;
  subtitle: string;
  services: string[];
  reviews: { quote: string; author: string }[];
  cta: string;
  locale: SiteLocale;
  templateId: TemplateId;
  generatedHtml?: string; 
  generationNotice?: string;
  skinId?: SkinId;
  sections?: SectionKind[];
  sectionVariants?: Partial<Record<SectionKind, "a" | "b">>;
  benefits?: { title: string; text: string }[];
  pricing?: { name: string; price: string; bullets: string[] }[];
  processSteps?: { title: string; text: string }[];
  faq?: { q: string; a: string }[];
  galleryItems?: { src: string; alt: string }[];
  mapEmbedSrc?: string;
  socialLinks?: { label: string; href: string }[];
  theme?: LandingTheme;
};
