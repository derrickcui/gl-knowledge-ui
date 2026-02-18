import { t } from "@/i18n";

export type RuleVersionEntry = {
  id: string;
  version: string;
  action: "LOADED" | "SAVED" | "SUBMITTED" | "PUBLISHED" | "AB_TESTED" | "DRAFT_B_APPLIED";
  at: string;
  added: number;
  removed: number;
  changed: number;
  riskLevel: string;
  complexityScore: number;
  abSummary?: {
    winner: "A" | "B" | "TIE";
    deltaHit: number;
    deltaHitRate: number;
  };
};

export function RuleVersionTimelinePanel({
  entries,
}: {
  entries: RuleVersionEntry[];
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.version.title")}</div>
      {entries.length === 0 ? (
        <div className="mt-2 text-xs text-slate-400">{t("ruleEditor.intel.empty")}</div>
      ) : (
        <div className="mt-3 space-y-3">
          {entries
            .slice()
            .reverse()
            .map((entry) => (
              <div key={entry.id} className="relative pl-5">
                <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-slate-400" />
                <div className="text-xs font-semibold text-slate-700">
                  {entry.version} · {actionLabel(entry.action)}
                </div>
                <div className="text-[11px] text-slate-500">{entry.at}</div>
                <div className="mt-1 text-[11px] text-slate-600">
                  +{entry.added} / -{entry.removed} / ~{entry.changed}
                </div>
                {entry.abSummary && (
                  <div className="text-[11px] text-slate-600">
                    {t("ruleEditor.version.abSummary", {
                      winner: entry.abSummary.winner,
                      delta: entry.abSummary.deltaHit,
                      rate: (entry.abSummary.deltaHitRate * 100).toFixed(1),
                    })}
                  </div>
                )}
                <div className="text-[11px] text-slate-600">
                  {t("ruleEditor.version.risk", {
                    level: entry.riskLevel,
                    score: entry.complexityScore,
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function actionLabel(action: RuleVersionEntry["action"]) {
  if (action === "SAVED") return t("ruleEditor.version.action.saved");
  if (action === "SUBMITTED") return t("ruleEditor.version.action.submitted");
  if (action === "PUBLISHED") return t("ruleEditor.version.action.published");
  if (action === "AB_TESTED") return t("ruleEditor.version.action.abTested");
  if (action === "DRAFT_B_APPLIED") return t("ruleEditor.version.action.draftBApplied");
  return t("ruleEditor.version.action.loaded");
}
