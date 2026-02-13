"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteTemplateVersion,
  fetchTemplateById,
  fetchTemplateVersionById,
  publishTemplateVersion,
  updateTemplateVersion,
} from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { TemplateCapabilityEditor } from "@/components/templates/TemplateCapabilityEditor";
import {
  parseTemplateCapabilityState,
  type TemplateCapabilityState,
} from "@/components/templates/capability-types";
import {
  TemplateExplainEditor,
  type ExplainState,
} from "@/components/templates/TemplateExplainEditor";

function normalizeExplain(value: unknown): ExplainState {
  if (!value || typeof value !== "object") {
    return { success: "", fail: "" };
  }
  const raw = value as { success?: unknown; fail?: unknown };
  return {
    success: typeof raw.success === "string" ? raw.success : "",
    fail: typeof raw.fail === "string" ? raw.fail : "",
  };
}

export default function TemplateVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version } = use(params);
  const router = useRouter();
  const initializedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [status, setStatus] = useState("");
  const [capability, setCapability] = useState<TemplateCapabilityState | null>(null);
  const [explain, setExplain] = useState<ExplainState>({ success: "", fail: "" });
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const locked = String(status).toUpperCase() === "PUBLISHED";

  async function loadVersion() {
    setLoading(true);
    setFeedback(null);
    const [versionRes, templateRes] = await Promise.all([
      fetchTemplateVersionById(id, version),
      fetchTemplateById(id),
    ]);
    if (!versionRes.data) {
      setFeedback({
        type: "error",
        title: "版本加载失败",
        message: versionRes.error ?? "Request failed",
      });
      setCapability(null);
      setLoading(false);
      return;
    }
    if (templateRes.data?.name) {
      setTemplateName(templateRes.data.name);
    } else {
      setTemplateName(`模板 #${String(id)}`);
    }
    const parsed = parseTemplateCapabilityState(versionRes.data.capability);
    if (!parsed) {
      setFeedback({
        type: "error",
        title: "版本能力结构无效",
      });
      setCapability(null);
      setLoading(false);
      return;
    }
    setStatus(versionRes.data.status);
    setCapability(parsed);
    setExplain(normalizeExplain(versionRes.data.explain));
    setLoading(false);
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    loadVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version]);

  async function handleSave() {
    if (!capability) return;
    setBusy(true);
    setFeedback({ type: "info", title: "正在保存版本..." });
    const res = await updateTemplateVersion(id, version, {
      capability: capability as unknown as Record<string, unknown>,
      explain,
    });
    if (!res.data) {
      setFeedback({
        type: "error",
        title: "保存失败",
        message: res.error ?? "Request failed",
      });
      setBusy(false);
      return;
    }
    setStatus(res.data.status);
    setFeedback({ type: "success", title: "版本已保存" });
    setBusy(false);
  }

  async function handlePublish() {
    setBusy(true);
    setFeedback({ type: "info", title: `正在发布 v${version}...` });
    const res = await publishTemplateVersion(id, version);
    if (!res.data) {
      setFeedback({
        type: "error",
        title: "发布失败",
        message: res.error ?? "Request failed",
      });
      setBusy(false);
      return;
    }
    setFeedback({ type: "success", title: `v${version} 已发布` });
    await loadVersion();
    setBusy(false);
  }

  async function handleDelete() {
    setBusy(true);
    setFeedback({ type: "info", title: `正在删除 v${version}...` });
    const res = await deleteTemplateVersion(id, version);
    if (!res.data && res.error) {
      setFeedback({
        type: "error",
        title: "删除失败",
        message: res.error,
      });
      setBusy(false);
      return;
    }
    router.push(`/knowledge/templates/${encodeURIComponent(String(id))}`);
  }

  if (loading) {
    return <div className="p-6 text-sm opacity-70">加载中...</div>;
  }

  if (!capability) {
    return <div className="p-6 text-sm text-red-600">版本不存在或加载失败。</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {templateName || `模板 #${String(id)}`} · 版本 v{version}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">状态: {status || "-"}</p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          disabled={busy}
          onClick={() => router.push(`/knowledge/templates/${encodeURIComponent(String(id))}`)}
        >
          返回模板
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
        <div className="mb-3 text-sm font-semibold">能力定义</div>
        <TemplateCapabilityEditor value={capability} disabled={busy || locked} onChange={setCapability} />
      </div>

      <div className="bg-white">
        <TemplateExplainEditor value={explain} disabled={busy || locked} onChange={setExplain} />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          disabled={busy || locked}
          onClick={handleDelete}
        >
          删除版本
        </button>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          disabled={busy || locked}
          onClick={handleSave}
        >
          保存
        </button>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
          disabled={busy || locked}
          onClick={handlePublish}
        >
          发布
        </button>
      </div>
    </div>
  );
}
