import type { TopicAiSuggestResponse } from "@/lib/topic-ai-api";

export function AiSuggestionPanel({
  suggestion,
  busy = false,
  error = null,
  onApply,
  onInsertTerms,
  onDismiss,
}: {
  suggestion: TopicAiSuggestResponse | null;
  busy?: boolean;
  error?: string | null;
  onApply: () => void;
  onInsertTerms: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">AI 建议</div>
          <div className="text-xs text-slate-500">基于当前节点的结构与语义补全。</div>
        </div>
        {busy ? <span className="text-xs text-slate-500">分析中...</span> : null}
      </div>

      {error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!suggestion ? (
        <div className="mt-3 text-sm text-slate-500">选择节点后点击 AI 按钮，建议会显示在这里。</div>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          {suggestion.summary ? <div className="rounded border bg-slate-50 p-3">{suggestion.summary}</div> : null}

          {suggestion.addTerms.length > 0 ? (
            <div className="rounded border bg-slate-50 p-3">
              <div className="font-medium text-slate-800">建议补充词</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestion.addTerms.map((item) => (
                  <span key={item} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700">
                    + {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {suggestion.issues.length > 0 ? (
            <div className="rounded border bg-slate-50 p-3">
              <div className="font-medium text-slate-800">问题</div>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {suggestion.issues.map((item) => (
                  <div key={item}>- {item}</div>
                ))}
              </div>
            </div>
          ) : null}

          {suggestion.cautions.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <div className="font-medium text-amber-900">注意事项</div>
              <div className="mt-2 space-y-1 text-xs text-amber-800">
                {suggestion.cautions.map((item) => (
                  <div key={item}>- {item}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-100 disabled:opacity-50"
              onClick={onApply}
              disabled={!suggestion.structureOptimization}
            >
              应用建议
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
              onClick={onInsertTerms}
              disabled={suggestion.addTerms.length === 0}
            >
              仅插入词
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={onDismiss}
            >
              忽略
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
