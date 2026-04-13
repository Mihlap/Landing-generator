import type { LandingData, SiteLocale } from "../types";

const jsonHeaders = { "Content-Type": "application/json" };

export type GenerateRequestOptions = {
  layoutMode?: "full" | "minimal";
};

export async function postGenerate(
  prompt: string,
  locale: SiteLocale,
  options?: GenerateRequestOptions,
): Promise<LandingData> {
  const res = await fetch("/generate", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      prompt,
      locale,
      ...(options?.layoutMode ? { layoutMode: options.layoutMode } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === "string" ? err.error : "Ошибка генерации");
  }
  return res.json() as Promise<LandingData>;
}

export async function postPreviewHtml(data: LandingData): Promise<string> {
  const res = await fetch("/preview", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.error === "string" ? err.error : "Ошибка предпросмотра");
  }
  return res.text();
}

export type PostExportOptions =
  | boolean
  | { mockPaid?: boolean; paymentId?: string | null };

export async function postExportHtml(data: LandingData, paidOrOptions?: PostExportOptions): Promise<Blob> {
  const options =
    typeof paidOrOptions === "boolean"
      ? { mockPaid: paidOrOptions }
      : paidOrOptions ?? {};
  const mockPaid = options.mockPaid === true;
  const paymentId =
    typeof options.paymentId === "string" && options.paymentId.trim() ? options.paymentId.trim() : undefined;

  const res = await fetch("/export", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      ...(mockPaid && !paymentId ? { "x-export-paid": "true" } : {}),
    },
    body: JSON.stringify({
      data,
      ...(mockPaid && !paymentId ? { paid: true } : {}),
      ...(paymentId ? { paymentId } : {}),
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    const msg =
      typeof err.message === "string"
        ? err.message
        : typeof err.error === "string"
          ? err.error
          : "Ошибка экспорта";
    throw new Error(msg);
  }
  return res.blob();
}
