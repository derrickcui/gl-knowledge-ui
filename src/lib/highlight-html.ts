export function sanitizeHighlightHtml(raw?: string | null): string {
  if (!raw) return "-";
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(
      /&lt;em&gt;/gi,
      '<em class="rounded bg-amber-100 px-0.5 font-medium not-italic text-amber-900">'
    )
    .replace(/&lt;\/em&gt;/gi, "</em>")
    .replace(/\r?\n/g, "<br />");
}
