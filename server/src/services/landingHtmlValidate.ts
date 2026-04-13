export type LandingHtmlIssue = { code: string; detail?: string };

export function validateLandingHtml(html: string): LandingHtmlIssue[] {
  const issues: LandingHtmlIssue[] = [];
  const lower = html.slice(0, 8000).toLowerCase();

  if (!/<!doctype\s+html/i.test(html) && !(/<html\b/i.test(lower) && /<body\b/i.test(lower))) {
    issues.push({ code: "not_html_document" });
  }

  if (!/<html[^>]*\slang\s*=\s*["'][^"']+["']/i.test(html)) {
    issues.push({ code: "missing_html_lang" });
  }

  if (!/name\s*=\s*["']viewport["']/i.test(html)) {
    issues.push({ code: "missing_viewport" });
  }

  const h1Open = (html.match(/<h1\b/gi) ?? []).length;
  if (h1Open === 0) issues.push({ code: "missing_h1" });
  if (h1Open > 1) issues.push({ code: "multiple_h1", detail: String(h1Open) });

  const ids = new Map<string, number>();
  const idRe = /\sid\s*=\s*["']([^"']+)["']/gi;
  let im: RegExpExecArray | null;
  while ((im = idRe.exec(html)) !== null) {
    const id = im[1].toLowerCase();
    ids.set(id, (ids.get(id) ?? 0) + 1);
  }
  for (const [id, c] of ids) {
    if (c > 1) issues.push({ code: "duplicate_id", detail: id });
  }

  if (/\shref\s*=\s*(["'])javascript:/i.test(html)) {
    issues.push({ code: "unsafe_javascript_href" });
  }

  return issues;
}

export function repairLandingHtml(html: string): string {
  return html.replace(/\shref\s*=\s*(["'])javascript:[^"']*\1/gi, ' href="#"');
}
