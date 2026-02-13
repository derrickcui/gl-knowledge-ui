"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

function statusLabel(status?: string) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "ACTIVE") return "启用中";
  if (normalized === "ARCHIVED") return "已归档";
  return status || "-";
}

export default function TemplatesPage() {
  const router = useRouter();
  const initializedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);

  async function loadAll() {
    setLoading(true);
    const res = await fetchTemplatesList();
    if (!res.data) {
      setFeedback({
        type: "error",
        title: "模板加载失败",
        message: res.error ?? "Request failed",
      });
      setTemplates([]);
    } else {
      setTemplates(res.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadAll();
  }, []);

  const filtered = templates.filter((item) => {
    const text = `${item.name} ${item.description} ${item.category}`.toLowerCase();
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return text.includes(keyword);
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">模板管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">企业级能力模板与版本治理</p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-4 text-sm text-white"
          onClick={() => router.push("/knowledge/templates/create")}
        >
          创建模板
        </button>
      </div>

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <input
        type="text"
        className="h-9 w-full rounded-md border px-3 text-sm"
        placeholder="搜索模板"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="space-y-3">
        {loading && <div className="text-sm opacity-70">加载中...</div>}
        {!loading && filtered.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">暂无模板</div>
        )}
        {!loading &&
          filtered.map((item) => (
            <div key={String(item.id)} className="rounded-md border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{item.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    当前版本 {item.currentVersion != null ? `v${item.currentVersion}` : "-"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">状态: {statusLabel(item.status)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-8 rounded-md border px-3 text-xs"
                    onClick={() =>
                      router.push(`/knowledge/templates/${encodeURIComponent(String(item.id))}`)
                    }
                  >
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
