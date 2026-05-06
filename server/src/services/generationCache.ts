import type { GenerateLandingOptions, LandingData, SiteLocale } from "./ai.js";

type CacheEntry = { value: LandingData; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

function cacheEnabled(): boolean {
  return process.env.LANDING_GENERATION_CACHE?.trim().toLowerCase() !== "false";
}

function cacheTtlMs(): number {
  const raw = Number(process.env.LANDING_GENERATION_CACHE_TTL_MS);
  if (!Number.isFinite(raw) || raw <= 0) return 10 * 60 * 1000;
  return Math.min(60 * 60 * 1000, Math.max(30 * 1000, Math.floor(raw)));
}

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 800);
}

function optionPart(options: GenerateLandingOptions | undefined): string {
  if (!options) return "-";
  return [
    options.generateMode ?? "-",
    options.layoutMode ?? "-",
    options.imagePreference ?? "-",
    options.skipVisualEnrichment ? "1" : "0",
  ].join("|");
}

export function generationCacheKey(
  prompt: string,
  locale: SiteLocale,
  options: GenerateLandingOptions | undefined,
): string {
  return `${locale}|${optionPart(options)}|${normalizePrompt(prompt)}`;
}

function cloneLandingData(data: LandingData): LandingData {
  return JSON.parse(JSON.stringify(data)) as LandingData;
}

export function readGenerationCache(key: string): LandingData | null {
  if (!cacheEnabled()) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return cloneLandingData(hit.value);
}

export function writeGenerationCache(key: string, value: LandingData): void {
  if (!cacheEnabled()) return;
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value: cloneLandingData(value), expiresAt: Date.now() + cacheTtlMs() });
}

