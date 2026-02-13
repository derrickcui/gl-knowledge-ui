import { t } from "@/i18n";
import type { NodeDiffDetail } from "./diff";

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
          <div className="text-xs text-slate-500">{t("ruleEditor.diff.removedItems")}</div>
          <div className="mt-1 space-y-1 text-xs text-slate-700">
            {diff.removedNodes.slice(0, 5).map((item) => (
              <div key={item.id}>- {item.signature || item.id}</div>
            ))}
            {diff.removedNodes.length > 5 && (
              <div>{t("ruleEditor.diff.moreRemoved", { count: diff.removedNodes.length - 5 })}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
