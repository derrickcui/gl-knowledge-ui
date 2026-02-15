import { t } from "@/i18n";
import type { RuntimeExecuteNodeResponse } from "@/lib/api/ruleRuntime";
import { HighlightFragment } from "./HighlightFragment";

export function NodeDetailPanel({
  result,
  activeNodeLabel,
  onSelectDocument,
  onPrevPage,
  onNextPage,
}: {
  result: RuntimeExecuteNodeResponse | null;
  activeNodeLabel?: string | null;
  onSelectDocument?: (docId: string) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
}) {
  const page = result?.page ?? 1;
  const size = result?.size ?? 20;
  const total = result?.nodeTotal ?? 0;

  return (
    <div className="min-h-0 rounded border bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-amber-700">NODE</div>
      {!result ? (
        <div className="rounded border border-dashed p-3 text-xs text-slate-500">
          {t("ruleEditor.preview.mode.node.currentCondition")} -
        </div>
      ) : (
        <>
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2 text-xs text-amber-900">
            <div>{t("ruleEditor.preview.mode.node.currentCondition")} {activeNodeLabel ?? result.nodeId}</div>
            <div className="mt-1 text-slate-700">
              <span>fullTotal: {result.fullTotal}</span>
              <span className="ml-2 text-sky-700">nodeTotal: {result.nodeTotal}</span>
              <span className="ml-2 text-amber-700">delta: +{result.delta}</span>
            </div>
          </div>
          <div className="mt-2 max-h-[440px] space-y-2 overflow-auto">
            {result.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded border px-2 py-2 text-left text-xs hover:bg-slate-50"
                onClick={() => onSelectDocument?.(item.id)}
              >
                <div className="font-medium text-slate-800">{item.title}</div>
                <div className="mt-1 text-slate-600">
                  {item.matchedReasons.map((reason) => reason.displayText ?? reason.label).join(" / ")}
                </div>
                {item.highlightFragments[0] && (
                  <HighlightFragment
                    html={item.highlightFragments[0]}
                    className="mt-1 text-slate-600 [&_mark]:rounded [&_mark]:bg-amber-200 [&_mark]:px-0.5 [&_mark]:text-slate-900"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-end gap-2 text-xs">
            <button
              type="button"
              className="rounded border px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              onClick={onPrevPage}
              disabled={page <= 1}
            >
              {t("ruleEditor.execution.page.prev")}
            </button>
            <span>{page}</span>
            <button
              type="button"
              className="rounded border px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
              onClick={onNextPage}
              disabled={page * size >= total}
            >
              {t("ruleEditor.execution.page.next")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
