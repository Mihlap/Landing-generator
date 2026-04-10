import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { postGenerate } from "../api/generate";
import type { SiteLocale } from "../types";

const descriptionHint: Record<SiteLocale, string> = {
  ru: `Пример: Краткое описание бизнеса и услуг
Стиль: Описание атмосферы и визуального решения
Цвета:[Основной фон + акцентные цвета (HEX или названия)
Структура: Список обязательных секций через запятую
Детали: Язык, тип анимаций, специфика текстов, особые требования`,
  en: `Example: Short description of the business and services
Style: Atmosphere and visual direction
Colors: Main background + accent colors (HEX or names)
Structure: Required sections, separated by commas
Detais: Language, animation style, copy specifics, special requirements`,
};

const benefits = [
  "Шаблон под нишу — без пустых конструкторов",
  "Тексты и блоки страницы за один запрос",
  "Предпросмотр, редактирование и выгрузка HTML",
] as const;

const IconExpand = memo(function IconExpand({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
});

const IconCollapse = memo(function IconCollapse({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 14h6v6M14 4h6v6M20 4l-5 5M4 20l5-5" />
    </svg>
  );
});

const textareaClassName =
  "w-full rounded-xl border border-slate-700/90 bg-slate-900/55 px-3 py-3 text-[0.9375rem] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/45 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export default function Home() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [siteLocale, setSiteLocale] = useState<SiteLocale>("ru");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);

  const closeExpandedPrompt = useCallback(() => setPromptExpanded(false), []);
  const openExpandedPrompt = useCallback(() => setPromptExpanded(true), []);
  const setLocaleRu = useCallback(() => setSiteLocale("ru"), []);
  const setLocaleEn = useCallback(() => setSiteLocale("en"), []);
  const onPromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);

  const localeIndicatorStyle = useMemo(
    () => ({
      width: "calc(50% - 0.375rem)",
      transform: siteLocale === "en" ? "translateX(calc(100% + 0.25rem))" : "translateX(0)",
    }),
    [siteLocale],
  );

  useEffect(() => {
    if (!promptExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpandedPrompt();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [closeExpandedPrompt, promptExpanded]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await postGenerate(prompt.trim(), siteLocale);
      navigate("/editor", { state: { data } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-12%,rgba(129,140,248,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_120%_0%,rgba(29,78,216,0.18),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.04)_0%,rgba(76,29,149,0.12)_45%,rgba(30,64,175,0.12)_100%)]"
        aria-hidden
      />

      {promptExpanded ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-slate-950 safe-px safe-pt safe-pb"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-expand-title"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/90 py-3">
            <h2 id="prompt-expand-title" className="text-sm font-medium text-slate-200">
              Описание задачи
            </h2>
            <button
              type="button"
              onClick={closeExpandedPrompt}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-300 touch-action-manipulation hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
            >
              <IconCollapse className="text-slate-400" />
              Свернуть
            </button>
          </div>
          <textarea
            id="prompt-expanded"
            autoFocus
            className={`mt-3 min-h-0 flex-1 resize-none ${textareaClassName}`}
            placeholder={descriptionHint[siteLocale]}
            value={prompt}
            onChange={onPromptChange}
            required
            aria-label="Описание сайта"
          />
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1 flex-col justify-center safe-px safe-pt safe-pb py-8 sm:py-11 lg:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-stretch lg:gap-14 xl:gap-20">
          <header className="mx-auto flex h-full w-full max-w-[28rem] flex-col text-left lg:mx-0 lg:max-w-lg">
            <div className="space-y-5">
              <div className="flex flex-col gap-3">
              <span className="fade-in-up self-center text-center text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-indigo-300/90 lg:self-start lg:text-left">
                AutoPage AI
              </span>
              <span className="hidden h-px w-12 self-center bg-gradient-to-r from-indigo-500/60 to-transparent lg:block lg:self-start" aria-hidden />
              </div>
              <h1 className="fade-in-up fade-in-delay-1 saas-heading-gradient text-balance text-left text-[clamp(1.5rem,4.8vw,2.5rem)] font-semibold leading-snug tracking-tight max-[768px]:text-center">
                Лендинг для бизнеса без лишних шагов
              </h1>
              <p className="fade-in-up fade-in-delay-2 hyphens-none text-pretty text-left text-sm leading-relaxed text-slate-300 [overflow-wrap:anywhere] sm:text-[0.9375rem]">
                Сформулируйте задачу текстом — сервис подберёт оформление и сгенерирует контент. Останется готовый черновик, который можно править и сохранить.
              </p>
            </div>
            <div className="fade-in-up fade-in-delay-3 w-full py-4 lg:flex-1 lg:py-6">
              <ul className="w-full space-y-4 text-left text-base leading-relaxed text-slate-200 sm:text-[1.0625rem] lg:flex lg:h-full lg:flex-col lg:justify-evenly lg:space-y-0">
                {benefits.map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70 ring-2 ring-emerald-500/20"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 leading-snug [overflow-wrap:anywhere]">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="fade-in-up fade-in-delay-4 text-pretty text-left text-sm leading-relaxed text-slate-300 [overflow-wrap:anywhere] sm:text-[0.9375rem] lg:pt-2">
              Чем точнее вы опишете задачу, аудиторию и стиль, тем быстрее получите структуру, тексты и готовый первый вариант страницы для редактирования.
            </p>
          </header>

          <div className="fade-in-up fade-in-delay-2 mx-auto w-full max-w-[28rem] lg:mx-0 lg:w-full lg:max-w-none lg:justify-self-end">
            <div className="relative rounded-2xl border border-indigo-900/70 bg-gradient-to-b from-slate-950/92 via-slate-950/82 to-indigo-950/45 p-5 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.65)] ring-1 ring-indigo-300/[0.08] backdrop-blur-md sm:p-6">
              <div
                className="pointer-events-none absolute inset-px rounded-[0.9375rem] bg-gradient-to-b from-white/[0.04] to-transparent opacity-60"
                aria-hidden
              />
              <div className="relative">
                <p className="mb-1 text-left text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Новый макет
                </p>
                <p className="mb-5 text-left text-xs leading-snug text-slate-600">
                  Один запрос — черновик в редакторе с предпросмотром
                </p>

                <form onSubmit={onSubmit} className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-500" id="site-lang-label">
                      Язык страницы
                    </p>
                    <div
                      className="relative grid min-h-[48px] grid-cols-2 grid-rows-1 gap-1 rounded-xl border border-slate-700/80 bg-slate-900/70 p-1"
                      role="group"
                      aria-labelledby="site-lang-label"
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-1 bottom-1 left-1 z-0 rounded-lg bg-slate-800 shadow-md ring-1 ring-white/[0.06] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-transform motion-reduce:transition-none"
                        style={localeIndicatorStyle}
                      />
                      <button
                        type="button"
                        onClick={setLocaleRu}
                        className={`relative z-10 flex min-h-0 w-full items-center justify-center self-stretch rounded-lg px-2 text-sm font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45 touch-action-manipulation ${
                          siteLocale === "ru" ? "text-white" : "text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        Русский
                      </button>
                      <button
                        type="button"
                        onClick={setLocaleEn}
                        className={`relative z-10 flex min-h-0 w-full items-center justify-center self-stretch rounded-lg px-2 text-sm font-medium leading-none transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45 touch-action-manipulation ${
                          siteLocale === "en" ? "text-white" : "text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor="prompt" className="text-xs font-medium text-slate-500">
                        Описание задачи
                      </label>
                      <button
                        type="button"
                        onClick={openExpandedPrompt}
                        className="inline-flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-md border border-slate-600/90 p-1 text-slate-400 touch-action-manipulation hover:bg-slate-800 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/45"
                        aria-label="Развернуть поле ввода на весь экран"
                        title="На весь экран"
                      >
                        <IconExpand className="shrink-0" />
                      </button>
                    </div>
                    {!promptExpanded ? (
                      <textarea
                        id="prompt"
                        rows={6}
                        className={`min-h-[11rem] max-h-[min(42dvh,17rem)] resize-none sm:min-h-[12rem] sm:max-h-[min(45dvh,19rem)] ${textareaClassName}`}
                        placeholder={descriptionHint[siteLocale]}
                        value={prompt}
                        onChange={onPromptChange}
                        required
                      />
                    ) : null}
                  </div>

                  {error && (
                    <p className="text-left text-sm leading-snug text-rose-400 [overflow-wrap:anywhere]" role="alert">
                      {error}
                    </p>
                  )}

                  <div className="space-y-2 border-t border-slate-800/80 pt-5">
                    <button
                      type="submit"
                      disabled={loading || !prompt.trim()}
                      className="inline-flex min-h-[48px] w-full items-center justify-center px-4 text-center text-[0.9375rem] font-semibold leading-tight text-white touch-action-manipulation rounded-xl bg-indigo-600 py-3 shadow-lg shadow-indigo-950/45 transition hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50"
                    >
                      {loading ? "Собираем страницу…" : "Собрать страницу"}
                    </button>
                    <p className="text-pretty text-left text-[0.7rem] leading-relaxed text-slate-600">
                      Регистрация не нужна — только описание и черновик в редакторе
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
