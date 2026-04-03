"use client";

import { t } from "@/i18n";

export function AIOptimizePanel({
  analysis,
  actions,
  suggestionActions = [],
}: {
  analysis: {
    issues: string[];
    suggestions: string[];
    explain?: string[];
  } | null;
  actions: Array<{
    id: string;
    label: string;
    hint: string;
    onClick: () => void;
  }>;
  suggestionActions?: Array<{
    id: string;
    title: string;
    reason: string;
    confidence?: number;
    onApply: () => void;
  }>;
}) {
  if (!analysis && actions.length === 0 && suggestionActions.length === 0) return null;

  return (
    <div className="space-y-4">
      {analysis && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {t("topicSet.ai.analysisTitle")}
          </div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">{t("topicSet.ai.currentIssues")}</div>
              <ul className="mt-1 space-y-1 text-sm">
                {analysis.issues.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("topicSet.ai.recommendations")}</div>
              <ul className="mt-1 space-y-1 text-sm">
                {analysis.suggestions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            {analysis.explain && analysis.explain.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">{t("topicSet.ai.explain")}</div>
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {analysis.explain.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-md bg-black px-3 py-1.5 text-xs text-white">
                {t("topicSet.ai.applySuggestion")}
              </button>
              <button type="button" className="rounded-md border bg-white px-3 py-1.5 text-xs">
                {t("topicSet.ai.viewExplain")}
              </button>
            </div>
          </div>
        </div>
      )}

      {suggestionActions.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {t("topicSet.ai.executableSuggestions")}
          </div>
          <div className="mt-3 space-y-3">
            {suggestionActions.map((item) => (
              <div key={item.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.reason}</div>
                  </div>
                  {typeof item.confidence === "number" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      {t("topicSet.ai.matchScore", { score: Math.round(item.confidence * 100) })}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800"
                    onClick={item.onApply}
                  >
                    {t("topicSet.ai.applySuggestion")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            {t("topicSet.ai.actionsTitle")}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-800"
                title={action.hint}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
