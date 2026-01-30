"use client";

import ExplainPreviewView from "@/components/explain/ExplainPreview";
import { ExplainBlock } from "@/components/explain/explainTypes";
import { RuleNode } from "@/components/rule-builder/astTypes";
import { GroupExplainView } from "@/components/rule-builder/explain/GroupExplainView";
import { t } from "@/i18n";

interface Props {
  explain?: { title?: string; blocks: ExplainBlock[] };
  rule?: RuleNode;
  activeConditionId?: string;
  onHoverCondition?: (id?: string) => void;
  onClickCondition?: (id?: string) => void;
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
  emptyMessage?: string;
  previewGql?: string | null;
  previewLoading?: boolean;
  previewError?: string | null;
  onPreviewGql?: () => void;
}

export function ExplainPreview({
  explain,
  rule,
  activeConditionId,
  onHoverCondition,
  onClickCondition,
  onHoverEvidence,
  onClickEvidence,
  emptyMessage,
  previewGql,
  previewLoading = false,
  previewError,
  onPreviewGql,
}: Props) {
  const sampleExplain: { title?: string; blocks: ExplainBlock[] } = {
    title: t("explainPreview.sample.title"),
    blocks: [
      {
        level: "INFO",
        title: t("explainPreview.sample.ruleMeaning"),
        lines: [
          t("explainPreview.sample.ruleLine1"),
          t("explainPreview.sample.ruleLine2"),
        ],
        evidence: [
          { path: [0], label: t("explainPreview.sample.evidenceConcept") },
          { path: [0, 0], label: t("explainPreview.sample.evidenceBody") },
        ],
      },
      {
        level: "WARNING",
        title: t("explainPreview.sample.warnTitle"),
        lines: [t("explainPreview.sample.warnLine")],
        evidence: [
          { path: [0], label: t("explainPreview.sample.evidenceScope") },
        ],
      },
    ],
  };

  const resolvedExplain = explain ?? sampleExplain;

  const handleCopyGql = async () => {
    if (!previewGql) return;
    try {
      await navigator.clipboard.writeText(previewGql);
    } catch {
      // No-op: clipboard may be blocked by browser policy.
    }
  };

  if (emptyMessage) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">
          {t("explainPreview.title")}
        </div>
        <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-slate-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  if (rule) {
    const groups = [...(rule.children ?? [])].sort(
      (a, b) => (b.priority ?? 100) - (a.priority ?? 100)
    );

    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">
          {t("explainPreview.title")}
        </div>
        {groups.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">
            {t("explainPreview.emptyScenario")}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {groups.map((group, idx) => (
              <div
                key={group.id ?? `group-${idx}`}
                className="rounded-md border p-3"
              >
                <div className="text-xs text-slate-500">
                  {t("explainPreview.scenarioLabel", {
                    index: idx + 1,
                    priority: group.priority ?? 100,
                  })}
                </div>
                {group.params?.operator === "EXCLUDE" && (
                  <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    {t("explainPreview.excludeHint")}
                  </div>
                )}
                <GroupExplainView
                  group={group}
                  activeConditionId={activeConditionId}
                  onHoverCondition={onHoverCondition}
                  onClickCondition={onClickCondition}
                />
              </div>
            ))}
          </div>
        )}

        {onPreviewGql && (
          <div className="mt-4 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-500">
                {t("explainPreview.gqlTitle")}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                  onClick={onPreviewGql}
                  disabled={previewLoading}
                >
                  {previewLoading
                    ? t("explainPreview.gqlLoading")
                    : t("explainPreview.gqlGenerate")}
                </button>
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:underline disabled:opacity-40"
                  onClick={handleCopyGql}
                  disabled={!previewGql}
                  title={
                    previewGql
                      ? t("explainPreview.gqlCopy")
                      : t("explainPreview.gqlCopyDisabled")
                  }
                >
                  {t("explainPreview.gqlCopy")}
                </button>
              </div>
            </div>
            {previewError && (
              <div className="mt-2 text-xs text-red-600">
                {previewError}
              </div>
            )}
            {previewGql && (
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border bg-slate-50 p-2 text-xs text-slate-700">
                {previewGql}
              </pre>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <ExplainPreviewView
      explain={resolvedExplain}
      onHoverEvidence={onHoverEvidence}
      onClickEvidence={onClickEvidence}
    />
  );
}
