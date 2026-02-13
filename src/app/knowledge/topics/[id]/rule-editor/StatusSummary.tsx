import { t } from "@/i18n";

type StatusSummaryProps = {
  issuesCount: number;
  diffAdded: number;
  diffRemoved: number;
  diffChanged: number;
  dirty: boolean;
};

export function StatusSummary({
  issuesCount,
  diffAdded,
  diffRemoved,
  diffChanged,
  dirty,
}: StatusSummaryProps) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.status.title")}</div>
      <div className="mt-2 space-y-1 text-xs text-slate-700">
        <div>
          {t("ruleEditor.status.editState", {
            state: dirty ? t("ruleEditor.status.dirty") : t("ruleEditor.status.synced"),
          })}
        </div>
        <div>{t("ruleEditor.status.issues", { count: issuesCount })}</div>
        <div>{t("ruleEditor.status.changes", { added: diffAdded, removed: diffRemoved, changed: diffChanged })}</div>
      </div>
    </div>
  );
}
