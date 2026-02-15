import { t } from "@/i18n";

export function GlobalSummaryBar({
  fullTotal,
  conditionCount,
  took,
  executionId,
}: {
  fullTotal: number;
  conditionCount: number;
  took?: number;
  executionId?: string;
}) {
  return (
    <div className="rounded-md border bg-blue-50 px-3 py-2 text-xs text-blue-900">
      <span className="font-semibold">{t("ruleEditor.execution.total")}: </span>
      <span>{fullTotal}</span>
      <span className="mx-2 text-blue-300">|</span>
      <span className="font-semibold">{t("ruleEditor.preview.impact.ranking.conditionCount")}: </span>
      <span>{conditionCount}</span>
      <span className="mx-2 text-blue-300">|</span>
      <span className="font-semibold">took: </span>
      <span>{took == null ? "-" : `${took}ms`}</span>
      <span className="mx-2 text-blue-300">|</span>
      <span className="font-semibold">执行ID: </span>
      <span className="truncate align-bottom">{executionId ?? "-"}</span>
    </div>
  );
}
