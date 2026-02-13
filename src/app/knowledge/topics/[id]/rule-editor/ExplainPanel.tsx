import { t } from "@/i18n";
import type { ExplainBlock } from "@/components/explain/explainTypes";

export type ExplainViewModel = {
  title?: string;
  blocks: ExplainBlock[];
};

export function ExplainPanel({ explain }: { explain: ExplainViewModel | null }) {
  const blocks = explain?.blocks ?? [];

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.explain.title")}</div>
      {explain?.title && <div className="mt-1 text-xs text-slate-500">{explain.title}</div>}

      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {blocks.length === 0 ? (
          <div className="text-sm text-slate-500">{t("ruleEditor.explain.empty")}</div>
        ) : (
          blocks.map((block, idx) => (
            <div key={`explain-${idx}`} className="rounded border p-3">
              <div className="text-sm font-medium">{block.title || t("ruleEditor.explain.blockTitle", { index: idx + 1 })}</div>
              {block.lines.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {block.lines.map((line, lineIndex) => (
                    <li key={`explain-${idx}-line-${lineIndex}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-2 text-xs text-slate-500">-</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
