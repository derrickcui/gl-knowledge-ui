"use client";

import { ChecklistSummary } from "./checklistTypes";
import { t } from "@/i18n";

export default function ReviewerChecklist({
  summary,
}: {
  summary: ChecklistSummary;
}) {
  const statusColor = summary.decision.canApprove
    ? "border-green-400 bg-green-50"
    : "border-red-400 bg-red-50";
  const importanceScenarios = summary.importance?.scenarios ?? [];

  return (
    <div className={`rounded border p-3 ${statusColor}`}>
      <div className="text-sm font-semibold">
        {t("review.checklist.title")}
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">
          {t("review.checklist.section.explain")}
        </div>
        <ul className="ml-4 list-disc text-xs text-slate-700">
          <li>
            {t("review.checklist.explain.added", {
              count: summary.explain.added,
            })}
          </li>
          <li>
            {t("review.checklist.explain.modified", {
              count: summary.explain.modified,
            })}
          </li>
          <li>
            {t("review.checklist.explain.removed", {
              count: summary.explain.removed,
            })}
          </li>
        </ul>
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">
          {t("review.checklist.section.quality")}
        </div>
        <ul className="ml-4 list-disc text-xs text-slate-700">
          <li>
            {t("review.checklist.quality.errors", {
              count: summary.antiPattern.errors,
            })}
          </li>
          <li>
            {t("review.checklist.quality.warnings", {
              count: summary.antiPattern.warnings,
            })}
          </li>
          <li>
            {t("review.checklist.quality.infos", {
              count: summary.antiPattern.infos,
            })}
          </li>
        </ul>
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">
          {t("review.checklist.section.importance")}
        </div>
        {importanceScenarios.length ? (
          <div className="mt-1 space-y-2 text-xs text-slate-700">
            {importanceScenarios.map((scenario) => (
              <div key={scenario.title}>
                <div className="font-medium text-slate-800">
                  {scenario.title}
                </div>
                <div className="mt-1">
                  {t("review.checklist.importance.mode")}
                </div>
                <div className="mt-1">
                  {t("review.checklist.importance.distribution")}
                </div>
                <ul className="ml-4 list-disc text-xs text-slate-700">
                  <li>
                    {t("review.checklist.importance.high", {
                      count: scenario.counts.high,
                    })}
                  </li>
                  <li>
                    {t("review.checklist.importance.normal", {
                      count: scenario.counts.normal,
                    })}
                  </li>
                  <li>
                    {t("review.checklist.importance.low", {
                      count: scenario.counts.low,
                    })}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-500">
            {t("review.checklist.importance.disabled")}
          </div>
        )}
      </div>

      <div className="mt-2 text-sm">
        <div className="font-medium">
          {t("review.checklist.section.decision")}
        </div>
        {summary.decision.canApprove ? (
          <div className="text-xs text-green-700">
            {t("review.checklist.decision.pass")}
          </div>
        ) : (
          <div className="text-xs text-red-700">
            {t("review.checklist.decision.fail")}
            <div>
              {t("review.checklist.decision.reason", {
                reason: summary.decision.reason ?? "",
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
