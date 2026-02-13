"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchTemplateById, RuleTemplateDetail } from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

function versionStatusLabel(status: string) {
  const normalized = String(status).toUpperCase();
  if (normalized === "PUBLISHED") return "已发布";
  if (normalized === "ARCHIVED") return "已归档";
  if (normalized === "DRAFT") return "草稿";
  return status;
}

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const initializedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<RuleTemplateDetail | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);

  async function loadDetail() {
    setLoading(true);
    setFeedback(null);
    const res = await fetchTemplateById(id);
    if (!res.data) {
      setTemplate(null);
      setFeedback({
        type: "error",
        title: "模板加载失败",
        message: res.error ?? "Request failed",
      });
      setLoading(false);
      return;
    }
    setTemplate(res.data);
    setLoading(false);
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="p-6 text-sm opacity-70">加载中...</div>;
  }

  if (!template) {
    return <div className="p-6 text-sm text-red-600">模板不存在或加载失败。</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {template.name || `模板 #${String(template.id)}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">模板元信息与版本列表</p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => router.push("/knowledge/templates")}
        >
          返回列表
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

      <div className="rounded-md border bg-white p-4">
        <div className="text-sm font-semibold">基本信息</div>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">名称</div>
            <div>{template.name || `模板 #${String(template.id)}`}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">分类</div>
            <div>{template.category}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">状态</div>
            <div>{template.status}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">当前版本</div>
            <div>{template.currentVersion != null ? `v${template.currentVersion}` : "-"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">说明</div>
            <div>{template.description}</div>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-white p-4">
        <div className="mb-3 text-sm font-semibold">版本列表</div>
        <div className="space-y-2">
          {template.versions.length === 0 && (
            <div className="rounded-md border border-dashed px-3 py-4 text-xs text-muted-foreground">
              暂无版本
            </div>
          )}
          {template.versions.map((item) => (
            <div key={String(item.version)} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">
                  v{item.version} {versionStatusLabel(item.status)}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  创建时间: {item.createdAt} / 创建人: {item.createdBy}
                </div>
              </div>
              <button
                type="button"
                className="h-8 rounded-md border px-3 text-xs"
                onClick={() =>
                  router.push(
                    `/knowledge/templates/${encodeURIComponent(String(template.id))}/versions/${encodeURIComponent(
                      String(item.version)
                    )}`
                  )
                }
              >
                {String(item.status).toUpperCase() === "PUBLISHED" ? "查看版本" : "编辑版本"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
