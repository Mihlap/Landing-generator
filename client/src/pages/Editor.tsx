import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { postPreviewHtml } from "../api/generate";
import { LOCATION_FROM_EDITOR, touchEditorPromoAnchor } from "../components/LabaPromo";
import type { LandingData } from "../types";

function normalizeData(raw: LandingData | undefined): LandingData | undefined {
  if (!raw) return undefined;
  return {
    ...raw,
    locale: raw.locale ?? "ru",
    templateId: raw.templateId ?? "dental",
  };
}

export default function Editor() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { data?: LandingData } | null;

  const data = useMemo(() => normalizeData(state?.data), [state?.data]);

  const [html, setHtml] = useState<string>("");
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);  
  const [previewFrameKey, setPreviewFrameKey] = useState(0);
  const wasEditingRef = useRef(false);

  const loadPreview = useCallback(async () => {
    if (!data) return;
    setLoadError(null);
    try {
      const h = await postPreviewHtml(data);
      setHtml(h);
      setDraftHtml(h);
      touchEditorPromoAnchor();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Ошибка предпросмотра");
    }
  }, [data]);

  useEffect(() => {
    if (!data) {
      navigate("/", { replace: true });
      return;
    }
    void loadPreview();
  }, [data, navigate, loadPreview]);

  useEffect(() => {
    touchEditorPromoAnchor();
  }, []);

  useEffect(() => {
    if (wasEditingRef.current && !editing) {
      setPreviewFrameKey((k) => k + 1);
    }
    wasEditingRef.current = editing;
  }, [editing]);

  if (!data) return null;

  const previewHtml = draftHtml || html;

  useEffect(() => {
    if (editing) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(Boolean(previewHtml));
  }, [editing, previewHtml]);

  function downloadHtml() {
    const source = (draftHtml || html).trim();
    if (!source) return;
    const blob = new Blob([source], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "landing.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePreviewLoad() {
    /** Не ждём все картинки — иначе оверлей висит до таймаута; контент в iframe дорисовывается сам. */
    requestAnimationFrame(() => setPreviewLoading(false));
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-100 truncate max-w-[min(100vw-8rem,32rem)]">
            {data.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            {editing ? "Предпросмотр" : "Редактировать HTML"}
          </button>
          <button
            type="button"
            onClick={() => void downloadHtml()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Скачать HTML
          </button>
          <Link
            to="/"
            state={LOCATION_FROM_EDITOR}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            ← Назад
          </Link>
        </div>
      </header>

      {data.generationNotice && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-600/50 bg-amber-950/50 px-4 py-2 text-sm text-amber-100">
          {data.generationNotice}
        </div>
      )}

      {loadError && (
        <p className="m-4 text-sm text-rose-400" role="alert">
          {loadError}
        </p>
      )}

      <main className="flex-1 bg-white">
        {editing ? (
          <textarea
            className="h-[calc(100vh-4rem)] w-full resize-none border-0 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none sm:p-5 sm:text-sm"
            value={draftHtml}
            onChange={(e) => setDraftHtml(e.target.value)}
            spellCheck={false}
            aria-label="Редактор HTML"
          />
        ) : previewHtml ? (
          <div className="relative min-h-[calc(100vh-4rem)]">
            {previewLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 text-sm text-slate-600">
                Загружаем изображения предпросмотра…
              </div>
            ) : null}
            <iframe
              key={previewFrameKey}
              onLoad={handlePreviewLoad}
              title="Предпросмотр лендинга"
              className="w-full min-h-[calc(100vh-4rem)] border-0"
              srcDoc={previewHtml}
              allow="fullscreen; geolocation"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[50vh] text-slate-500 text-sm">
            Загрузка предпросмотра…
          </div>
        )}
      </main>
    </div>
  );
}
