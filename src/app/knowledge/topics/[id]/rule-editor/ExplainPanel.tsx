import { useMemo, useState } from "react";
import { t } from "@/i18n";
import type { ExplainBlock } from "@/components/explain/explainTypes";

export type ExplainViewModel = {
  title?: string;
  blocks: ExplainBlock[];
  professionalText?: string;
  businessText?: string;
};

export function ExplainPanel({ explain }: { explain: ExplainViewModel | null }) {
  const blocks = explain?.blocks ?? [];
  const hasProfessional = Boolean(explain?.professionalText) || blocks.length > 0;
  const hasBusiness = Boolean(explain?.businessText);
  const showTabs = hasProfessional && hasBusiness;
  const [activeTab, setActiveTab] = useState<"professional" | "business">(
    hasBusiness ? "business" : "professional"
  );
  const normalizedTab = useMemo(() => {
    if (activeTab === "business" && hasBusiness) return "business";
    return "professional";
  }, [activeTab, hasBusiness]);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.explain.title")}</div>
      {explain?.title && <div className="mt-1 text-xs text-slate-500">{explain.title}</div>}
      {showTabs && (
        <div className="mt-3 inline-flex rounded border bg-slate-50 p-1 text-xs">
          <button
            type="button"
            className={`rounded px-2 py-1 ${
              normalizedTab === "professional"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
            onClick={() => setActiveTab("professional")}
          >
            {t("ruleEditor.explain.tab.professional")}
          </button>
          <button
            type="button"
            className={`rounded px-2 py-1 ${
              normalizedTab === "business"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600"
            }`}
            onClick={() => setActiveTab("business")}
          >
            {t("ruleEditor.explain.tab.business")}
          </button>
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm text-slate-700">
        {normalizedTab === "business" && explain?.businessText ? (
          <div className="rounded border p-3 leading-6">{explain.businessText}</div>
        ) : explain?.professionalText ? (
          <div className="rounded border p-3 whitespace-pre-wrap leading-6">
            {explain.professionalText}
          </div>
        ) : blocks.length === 0 ? (
          <div className="text-sm text-slate-500">{t("ruleEditor.explain.empty")}</div>
        ) : (
          blocks.map((block, idx) => (
            <div key={`explain-${idx}`} className="rounded border p-3">
              <div className="text-sm font-medium">
                {block.title || t("ruleEditor.explain.blockTitle", { index: idx + 1 })}
              </div>
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
