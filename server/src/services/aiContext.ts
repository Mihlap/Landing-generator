export type LandingContext = {
  niche: string;
  tone: "premium" | "mass" | "friendly" | "technical";
  style: "light" | "dark" | "gradient" | "minimal";
  target: "local" | "online" | "product";
};

export function analyzePrompt(prompt: string): LandingContext {
  const p = prompt.toLowerCase();

  let niche = "general";
  if (/барбер|парикмахер|hair|barber/i.test(p)) niche = "beauty";
  if (/авто|car|repair/i.test(p)) niche = "auto";
  if (/стоматолог|dental/i.test(p)) niche = "medical";
  if (/курс|обучение|course/i.test(p)) niche = "education";
  if (/saas|app|сервис/i.test(p)) niche = "saas";

  let tone: LandingContext["tone"] = "mass";
  if (/premium|lux|элит/i.test(p)) tone = "premium";
  if (/дети|kids/i.test(p)) tone = "friendly";
  if (/api|dev|platform/i.test(p)) tone = "technical";

  let style: LandingContext["style"] = "light";
  if (/тёмн|темн|dark|ночн|уголь|charcoal/i.test(p)) style = "dark";
  else if (niche === "auto") style = "dark";
  if (niche === "saas") style = "gradient";
  if (tone === "premium") style = "minimal";

  let target: LandingContext["target"] = "local";
  if (/онлайн|online/i.test(p)) target = "online";
  if (niche === "saas") target = "product";

  return { niche, tone, style, target };
}

export function buildEnrichedUserMessage(prompt: string, ctx: LandingContext, year?: number): string {
  const yearLine = year ? `Текущий календарный год для копирайта в подвале: ${year}.\n` : "";
  return `Создай лендинг на основе данных:

Описание бизнеса:
${prompt}

Контекст:
- ниша: ${ctx.niche}
- стиль: ${ctx.style}
- тон: ${ctx.tone}
- тип: ${ctx.target}

Важно:
- дизайн должен соответствовать этому контексту
- блоки должны подбираться автоматически
- не делай отдельные «страницы сайта» и не разбивай на несколько HTML — всё содержание на одной странице
- контакты внизу должны быть полным блоком на всю ширину страницы
${yearLine}`.trim();
}
