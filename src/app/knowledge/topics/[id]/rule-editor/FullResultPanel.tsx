import { Search } from "lucide-react";
import { t } from "@/i18n";
import type { RuntimeExecuteFullResponse } from "@/lib/api/ruleRuntime";
import type { RulePreviewResponse } from "@/lib/rule-preview-api";
import { HighlightFragment } from "./HighlightFragment";

type FullResultLike = RuntimeExecuteFullResponse | RulePreviewResponse | null;

function isRuntimeFullResult(result: FullResultLike): result is RuntimeExecuteFullResponse {
  return Boolean(result && "mode" in result && result.mode === "FULL");
}

function isRuntimeMatchedReason(
  reason: RuntimeExecuteFullResponse["items"][number]["matchedReasons"][number] | RulePreviewResponse["items"][number]["matchedReasons"][number]
): reason is RuntimeExecuteFullResponse["items"][number]["matchedReasons"][number] {
  return "matchedTerms" in reason || "displayText" in reason;
}

export function FullResultPanel({
  result,
  page,
  size,
  modeLabel = "FULL",
  searchText,
  onSearchChange,
  onSelectDocument,
  onTriggerNodeByReason,
  onPrevPage,
  onNextPage,
}: {
  result: FullResultLike;
  page?: number;
  size?: number;
  modeLabel?: string;
  searchText: string;
  onSearchChange: (value: string) => void;
  onSelectDocument?: (docId: string) => void;
  onTriggerNodeByReason?: (keyword: string) => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
}) {
  const keyword = searchText.trim().toLowerCase();
  const runtimeResult = isRuntimeFullResult(result) ? result : null;
  const previewResult = runtimeResult ? null : result;
  const rawItems = runtimeResult?.items ?? previewResult?.items ?? [];
  const items = rawItems.filter((item) => {
    if (!keyword) return true;
    const reasonText = item.matchedReasons.map((reason) => {
      if (isRuntimeMatchedReason(reason)) {
        return reason.displayText ?? reason.label;
      }
      return reason.keyword ?? reason.label;
    }).join(" ");
    return `${item.title} ${reasonText}`.toLowerCase().includes(keyword);
  });

  const currentPage = page ?? runtimeResult?.page ?? 1;
  const currentSize = size ?? runtimeResult?.size ?? 20;
  const total = runtimeResult?.total ?? previewResult?.total ?? 0;

  return (
    <div className="min-h-0 rounded border bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-blue-700">{modeLabel}</div>
      <div className="mb-2 text-xs text-slate-700">
        {t("ruleEditor.execution.total")}: {total} | Page: {currentPage} / Size: {currentSize}
      </div>
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("ruleEditor.previewGql.searchPlaceholder")}
          className="h-8 w-full rounded border bg-white pl-3 pr-8 text-xs leading-8"
        />
      </div>
      <div className="max-h-[440px] space-y-2 overflow-auto">
        {items.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            className="w-full rounded border px-2 py-2 text-left text-xs hover:bg-slate-50"
            onClick={() => onSelectDocument?.(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectDocument?.(item.id);
              }
            }}
          >
            <div className="font-medium text-slate-800">{item.title}</div>
            {item.matchedReasons.length > 0 ? (
              <div className="mt-1 text-slate-600">
                <span className="font-medium text-slate-700">{t("ruleEditor.execution.matchedReason")}</span>
                <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
                  {item.matchedReasons.map((reason, index) => {
                    const keywordText =
                      isRuntimeMatchedReason(reason)
                        ? reason.matchedTerms?.[0] ?? reason.displayText ?? reason.label
                        : reason.keyword ?? reason.label;
                    return (
                      <button
                        type="button"
                        key={`${item.id}-reason-${index}`}
                        className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 hover:bg-slate-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          onTriggerNodeByReason?.(keywordText);
                        }}
                      >
                        {keywordText}
                      </button>
                    );
                  })}
                </span>
              </div>
            ) : null}
            {item.highlightFragments[0] ? (
              <HighlightFragment
                html={item.highlightFragments[0]}
                className="mt-1 text-slate-600 [&_mark]:rounded [&_mark]:bg-amber-200 [&_mark]:px-0.5 [&_mark]:text-slate-900"
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs">
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
        >
          {t("ruleEditor.execution.page.prev")}
        </button>
        <span>{currentPage}</span>
        <button
          type="button"
          className="rounded border px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          onClick={onNextPage}
          disabled={currentPage * currentSize >= total}
        >
          {t("ruleEditor.execution.page.next")}
        </button>
      </div>
    </div>
  );
}
