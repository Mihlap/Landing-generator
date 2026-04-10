import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { postExportHtml, postPreviewHtml } from "../api/generate";
import { touchEditorPromoAnchor } from "../components/LabaPromo";
import { LOCATION_FROM_EDITOR } from "../constants/navigation";
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
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

  if (!data) return null;
  const landingData = data;

  const previewHtml = draftHtml || html;

  useEffect(() => {
    if (editing) {
      setPreviewLoading(false);
      return;
    }
    if (!previewHtml) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
  }, [editing, previewHtml]);

  async function downloadHtml() {
    setExportError(null);
    setExportLoading(true);
    try {
      const blob = await postExportHtml(landingData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "landing.html";
      a.click();
      URL.revokeObjectURL(url);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка экспорта";
      setExportError(msg);
    } finally {
      setExportLoading(false);
    }
  }

  function downloadHtmlLegacyFallback() {
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

  const finishPreviewLoading = useCallback(() => {
    setPreviewLoading(false);
  }, []);

  const handlePreviewLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const maxMs = 25_000;
    const deadline = window.setTimeout(finishPreviewLoading, maxMs);

    if (!doc?.body) {
      window.setTimeout(finishPreviewLoading, 400);
      window.clearTimeout(deadline);
      return;
    }

    const imgs = Array.from(doc.querySelectorAll("img[src]")) as HTMLImageElement[];
    if (imgs.length === 0) {
      window.clearTimeout(deadline);
      finishPreviewLoading();
      return;
    }

    let pending = 0;
    const done = () => {
      pending -= 1;
      if (pending <= 0) {
        window.clearTimeout(deadline);
        finishPreviewLoading();
      }
    };

    for (const img of imgs) {
      if (img.complete && img.naturalWidth > 0) continue;
      pending += 1;
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }

    if (pending === 0) {
      window.clearTimeout(deadline);
      finishPreviewLoading();
    }
  }, [finishPreviewLoading]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-100 truncate max-w-[min(100vw-8rem,32rem)]">
            {landingData.title}
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
            disabled={exportLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportLoading ? "Экспортируем..." : "Скачать HTML"}
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

      {landingData.generationNotice && (
        <div className="mx-4 mt-3 rounded-lg border border-amber-600/50 bg-amber-950/50 px-4 py-2 text-sm text-amber-100">
          {landingData.generationNotice}
        </div>
      )}

      {loadError && (
        <p className="m-4 text-sm text-rose-400" role="alert">
          {loadError}
        </p>
      )}
      {exportError && (
        <p className="m-4 text-sm text-rose-400" role="alert">
          {exportError}{" "}
          <button
            type="button"
            onClick={downloadHtmlLegacyFallback}
            className="underline underline-offset-2 hover:text-rose-300"
          >
            Скачать текущий HTML без серверной обработки
          </button>
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
              ref={iframeRef}
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
