import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LABA_URL = "https://laba-laba.ru/";
const STORAGE_EDITOR_ANCHOR = "laba-promo-editor-anchor";

const DELAY_HOME_MS = 30 * 1000;
const DELAY_EDITOR_MS = 2 * 60 * 1000;

const EDITOR_ANCHOR_EVENT = "laba-promo-editor-anchor";

type BrowserTimerId = number;

/** Сброс окна подсказки редактора: отсчёт 2 мин от якоря (вход на /editor или готовый предпросмотр). */
export function touchEditorPromoAnchor(): void {
  try {
    sessionStorage.setItem(STORAGE_EDITOR_ANCHOR, String(Date.now()));
  } catch {
  }
  window.dispatchEvent(new Event(EDITOR_ANCHOR_EVENT));
}

function isLabaHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  return h === "laba-laba.ru" || h.endsWith(".laba-laba.ru");
}

type PromoVariant = "home" | "editor";

function PromoInner({ onDismiss, variant }: { onDismiss: () => void; variant: PromoVariant }) {
  const ed = variant === "editor";
  return (
    <div className="flex gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p
          className={`text-sm font-semibold leading-snug tracking-tight sm:text-[0.9375rem] ${ed ? "text-zinc-50" : "text-white"}`}
        >
          Нужна помощь с сайтом?
        </p>
        <p
          className={`text-sm leading-relaxed sm:text-[0.9375rem] ${ed ? "text-zinc-400" : "text-slate-100"}`}
        >
          Сделаем сайт под ваши задачи и пожелания — от лендинга до более сложных страниц.
        </p>
        <p className="pt-0.5">
          <a
            href={LABA_URL}
            target="_blank"
            rel="noopener noreferrer"
            lang="en"
            className={
              ed
                ? "inline-flex items-center rounded-lg bg-teal-500/20 px-2.5 py-1 text-sm font-semibold text-teal-100 shadow-[0_6px_20px_-6px_rgba(20,184,166,0.35)] transition hover:bg-teal-500/35 hover:text-white hover:shadow-[0_10px_28px_-8px_rgba(20,184,166,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                : "inline-flex items-center rounded-lg bg-indigo-500/20 px-2.5 py-1 text-sm font-semibold text-indigo-200 ring-1 ring-indigo-400/30 transition hover:bg-indigo-500/30 hover:text-white hover:ring-indigo-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            }
          >
            Laba
          </a>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className={`h-8 w-8 shrink-0 self-start rounded-lg transition ${
          ed
            ? "text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`}
        aria-label="Закрыть"
      >
        <span className="text-lg leading-none" aria-hidden>
          ×
        </span>
      </button>
    </div>
  );
}

export const LOCATION_FROM_EDITOR = { fromEditor: true as const };

export function LabaPromoHome() {
  const { pathname, state: locationState } = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  const resetHomeDismissed = useCallback(() => setDismissed(false), []);
  const timerRef = useRef<BrowserTimerId | null>(null);
  
  const navFromEditor = useMemo(() => {
    const st = locationState as { fromEditor?: boolean } | null | undefined;
    return Boolean(st && typeof st === "object" && st.fromEditor === true);
  }, [locationState]);

  useLayoutEffect(() => {
    if (!navFromEditor) return;
    resetHomeDismissed();
    setVisible(false);
    navigate(pathname, { replace: true, state: {} });
  }, [navFromEditor, navigate, pathname, resetHomeDismissed]);

  useEffect(() => {
    if (dismissed || isLabaHost()) return;
    if (pathname !== "/") {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setTimeout(() => setVisible(true), DELAY_HOME_MS);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pathname, dismissed]);

  if (dismissed || !visible || pathname !== "/" || isLabaHost()) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-4 safe-pb pointer-events-none"
      role="dialog"
      aria-label="Предложение студии Laba: помощь с сайтом"
    >
      <div className="laba-promo-slide-bottom pointer-events-auto w-full max-w-lg rounded-xl border border-indigo-400/45 bg-slate-950 px-4 py-3 shadow-[0_-12px_48px_-8px_rgba(0,0,0,0.55),0_-8px_40px_-12px_rgba(79,70,229,0.35)] ring-1 ring-white/10 backdrop-blur-md sm:px-5 sm:py-4">
        <PromoInner variant="home" onDismiss={dismiss} />
      </div>
    </div>
  );
}

export function LabaPromoEditor() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);
  const timerRef = useRef<BrowserTimerId | null>(null);

  useEffect(() => {
    if (dismissed) return;
    if (pathname !== "/editor") {
      setVisible(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    function scheduleFromAnchor() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      let raw: string | null = null;
      try {
        raw = sessionStorage.getItem(STORAGE_EDITOR_ANCHOR);
      } catch {
        raw = null;
      }
      let anchor = raw ? Number(raw) : NaN;
      if (!Number.isFinite(anchor) || anchor <= 0) {
        anchor = Date.now();
        try {
          sessionStorage.setItem(STORAGE_EDITOR_ANCHOR, String(anchor));
        } catch {   
        }
      }
      const remaining = DELAY_EDITOR_MS - (Date.now() - anchor);
      if (remaining <= 0) {
        setVisible(true);
        return;
      }
      setVisible(false);
      timerRef.current = window.setTimeout(() => setVisible(true), remaining);
    }

    scheduleFromAnchor();
    window.addEventListener(EDITOR_ANCHOR_EVENT, scheduleFromAnchor);
    return () => {
      window.removeEventListener(EDITOR_ANCHOR_EVENT, scheduleFromAnchor);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, dismissed]);

  if (dismissed || !visible || pathname !== "/editor") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-0 min-w-0 items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Предложение студии Laba: помощь с сайтом"
    >
      <div className="laba-promo-enter-center w-full max-w-lg rounded-2xl bg-zinc-950/97 px-4 py-4 shadow-[0_28px_72px_-20px_rgba(0,0,0,0.62),0_48px_120px_-48px_rgba(20,184,166,0.22),0_0_80px_-24px_rgba(45,212,191,0.12)] sm:px-6 sm:py-5">
        <PromoInner variant="editor" onDismiss={dismiss} />
      </div>
    </div>
  );
}
