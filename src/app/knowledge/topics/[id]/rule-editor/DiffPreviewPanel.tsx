import { t } from "@/i18n";
import type { NodeDiffDetail } from "./diff";

function formatRemovedItem(signature: string, id: string): string {
  if (!signature) {
    return t("ruleEditor.diff.removedItem.fallback", { id });
  }

  const parts = signature.split(":");
  const type = parts[0];

  if (type === "FIELD") {
    const field = parts[1];
    const fieldLabel =
      field === "TITLE"
        ? t("ruleEditor.tree.node.fieldOnly.title")
        : field === "COLUMN"
          ? t("ruleEditor.tree.node.fieldOnly.column")
          : t("ruleEditor.tree.node.fieldOnly.content");
    return t("ruleEditor.diff.removedItem.field", { field: fieldLabel });
  }

  if (type === "LOGIC") {
    const operator = parts[1];
    const modeKey =
      operator === "AT_LEAST"
        ? "ruleEditor.capability.mode.atLeast"
        : operator === "ACCRUE"
          ? "ruleEditor.capability.mode.accrue"
          : operator === "LOGSUM" || operator === "WEIGHTED"
            ? "ruleEditor.capability.mode.weighted"
            : operator === "OR" || operator === "ANY"
              ? "ruleEditor.capability.mode.any"
              : "ruleEditor.capability.mode.all";
    return t("ruleEditor.diff.removedItem.logic", { mode: t(modeKey) });
  }

  if (type === "TERM_SET") {
    const termIds = (parts[3] ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const count = termIds.length;
    return t("ruleEditor.diff.removedItem.termSet", { count });
  }

  if (type === "STRUCTURE") {
    const scope = parts[1];
    const scopeLabel =
      scope === "SENTENCE"
        ? t("ruleEditor.structureScope.sentence")
        : scope === "PARAGRAPH"
          ? t("ruleEditor.structureScope.paragraph")
          : t("ruleEditor.structureScope.none");
    return t("ruleEditor.diff.removedItem.structure", { scope: scopeLabel });
  }

  if (type === "POSITION_RELATION" || type === "PROXIMITY") {
    return t("ruleEditor.diff.removedItem.positionRelation");
  }

  return t("ruleEditor.diff.removedItem.fallback", { id });
}

export function DiffPreviewPanel({ diff }: { diff: NodeDiffDetail }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.diff.title")}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
          {t("ruleEditor.diff.added", { count: diff.added })}
        </div>
        <div className="rounded border border-red-200 bg-red-50 p-2 text-red-700">
          {t("ruleEditor.diff.removed", { count: diff.removed })}
        </div>
        <div className="rounded border border-blue-200 bg-blue-50 p-2 text-blue-700">
          {t("ruleEditor.diff.changed", { count: diff.changed })}
        </div>
      </div>
      {diff.removedNodes.length > 0 && (
        <div className="mt-3">
          <div className="text-xs text-slate-500">
            {t("ruleEditor.diff.removedItems")}
          </div>
          <div className="mt-1 space-y-1 text-xs text-slate-700">
            {diff.removedNodes.slice(0, 5).map((item) => (
              <div key={item.id}>
                - {formatRemovedItem(item.signature || "", item.id)}
              </div>
            ))}
            {diff.removedNodes.length > 5 && (
              <div>
                {t("ruleEditor.diff.moreRemoved", {
                  count: diff.removedNodes.length - 5,
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
