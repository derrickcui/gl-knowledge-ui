"use client";

import { t } from "@/i18n";

export function AIInsightPanel({
  expanded,
  summary,
  onToggle,
  onOptimize,
  onApplyOneByOne,
}: {
  expanded: boolean;
  summary: {
    coverage: string;
    overlap: string;
    unmapped: string;
    issues: string[];
    suggestions: string[];
  };
  onToggle: () => void;
  onOptimize: () => void;
  onApplyOneByOne: () => void;
}) {
  return (
    <section className="sticky bottom-4 z-20 rounded-xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={onToggle}
      >
        <div>
          <div className="text-sm font-semibold">{t("topicSet.ai.insightPanelTitle")}</div>
          <div className="mt-1 text-xs text-muted-foreground">{t("topicSet.ai.insightPanelSubtitle")}</div>
        </div>
        <span className="text-xs text-muted-foreground">
          {expanded ? t("topicSet.ai.collapse") : t("topicSet.ai.expand")}
        </span>
      </button>
      {expanded && (
        <div className="grid gap-4 border-t px-4 py-4 lg:grid-cols-[220px,1fr]">
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-[11px] text-muted-foreground">{t("topicSet.tab.coverage")}</div>
              <div className="mt-1 text-lg font-semibold">{summary.coverage}</div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-[11px] text-muted-foreground">Overlap</div>
              <div className="mt-1 text-lg font-semibold">{summary.overlap}</div>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3">
              <div className="text-[11px] text-muted-foreground">{t("topicSet.tab.unmapped")}</div>
              <div className="mt-1 text-lg font-semibold">{summary.unmapped}</div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                {t("topicSet.ai.currentIssues")}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {summary.issues.length > 0 ? (
                  summary.issues.map((item) => <li key={item}>- {item}</li>)
                ) : (
                  <li>- {t("topicSet.ai.issueHealthy")}</li>
                )}
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {t("topicSet.ai.recommendations")}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                {summary.suggestions.length > 0 ? (
                  summary.suggestions.map((item) => <li key={item}>- {item}</li>)
                ) : (
                  <li>- {t("topicSet.ai.suggestionMaintain")}</li>
                )}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="rounded-md bg-black px-3 py-1.5 text-xs text-white" onClick={onOptimize}>
                  {t("topicSet.ai.optimizeOneClick")}
                </button>
                <button type="button" className="rounded-md border bg-white px-3 py-1.5 text-xs" onClick={onApplyOneByOne}>
                  {t("topicSet.ai.applyOneByOne")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
