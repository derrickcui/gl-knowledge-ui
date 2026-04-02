import { useState } from "react";
import type { AiInvocationView } from "@/lib/topic-ai-api";

export function AiInvocationPanel({
  items,
  total,
  busy = false,
  error = null,
  onRefresh,
}: {
  items: AiInvocationView[];
  total: number;
  busy?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">AI 调用记录</div>
          <div className="text-xs text-slate-500">最近 {items.length} / {total} 条</div>
        </div>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
          onClick={onRefresh}
          disabled={!onRefresh || busy}
        >
          {busy ? "刷新中..." : "刷新"}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">暂无调用记录。</div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-800">
                      {item.capability}
                      {" · "}
                      {item.provider || "-"}
                      {" / "}
                      {item.model || "-"}
                    </div>
                    <div className="mt-1 text-slate-500">{item.createdAt}</div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 ${
                      item.parsedSuccess ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.parsedSuccess ? "SUCCESS" : item.errorCode || "FAILED"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                  <span>ID: {item.id}</span>
                  {item.promptVersion ? <span>Prompt: {item.promptVersion}</span> : null}
                  {item.createdBy ? <span>By: {item.createdBy}</span> : null}
                </div>
                <button
                  type="button"
                  className="mt-2 rounded border bg-white px-2 py-1 text-[11px] hover:bg-slate-100"
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                >
                  {expanded ? "收起详情" : "展开详情"}
                </button>
                {expanded ? (
                  <div className="mt-2 space-y-2">
                    {item.promptText ? (
                      <div className="rounded border bg-white p-2">
                        <div className="font-medium text-slate-700">Prompt</div>
                        <div className="mt-1 whitespace-pre-wrap break-words text-slate-600">{item.promptText}</div>
                      </div>
                    ) : null}
                    {item.responseText ? (
                      <div className="rounded border bg-white p-2">
                        <div className="font-medium text-slate-700">Response</div>
                        <div className="mt-1 whitespace-pre-wrap break-words text-slate-600">{item.responseText}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
