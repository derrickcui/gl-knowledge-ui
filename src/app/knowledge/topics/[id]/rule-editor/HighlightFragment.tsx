type HighlightFragmentProps = {
  html: string;
  className?: string;
};

export function HighlightFragment({ html, className }: HighlightFragmentProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: sanitizeHighlightHtml(html),
      }}
    />
  );
}

function sanitizeHighlightHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<mark\b[^>]*>/gi, "<mark>")
    .replace(/<\/mark\s*>/gi, "</mark>")
    .replace(/<br\s*\/?>/gi, "<br/>")
    .replace(/<(?!\/?mark\b|br\s*\/?>)[^>]+>/gi, "");
}
