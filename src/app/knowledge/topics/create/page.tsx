"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTopic } from "@/lib/topic-api";
import { fetchTemplatesList } from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export const dynamic = "force-dynamic";

function TopicCreatePageClient() {
  const search = useSearchParams();
  const router = useRouter();
  const selectedTemplate = search.get("template");
  const initName = search.get("name") ?? "";
  const initDescription = search.get("description") ?? "";
  const [name, setName] = useState(initName);
  const [description, setDescription] = useState(initDescription);
  const [templateName, setTemplateName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTemplate) return;
    (async () => {
      const listRes = await fetchTemplatesList({ status: "PUBLISHED" });
      const template = (listRes.data ?? []).find(
        (item) => String(item.id) === String(selectedTemplate)
      );
      if (template) setTemplateName(template.name ?? "");
    })();
  }, [selectedTemplate]);

  async function handleCreate() {
    if (!selectedTemplate) {
      setError("请先选择模板");
      return;
    }
    if (!name.trim() || !description.trim()) return;
    setBusy(true);
    setError(null);
    const result = await createTopic({
      name: name.trim(),
      description: description.trim(),
      template: selectedTemplate,
    });
    if (!result.data) {
      setError(result.error ?? "创建失败");
      setBusy(false);
      return;
    }
    router.push(`/knowledge/topics/${encodeURIComponent(result.data.id)}`);
  }

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-lg font-semibold">创建主题</h1>
      <div className="mt-2 text-sm text-muted-foreground">
        已选模板: {templateName || "未选择"}
      </div>

      {error && (
        <div className="mt-3">
          <FeedbackBanner type="error" title={error} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium">主题名称</label>
          <input
            type="text"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">业务描述</label>
          <textarea
            className="mt-1 min-h-[96px] w-full rounded-md border px-3 py-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          disabled={busy}
          onClick={() => router.push("/knowledge/topics/create/select-template")}
        >
          返回选模板
        </button>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
          disabled={busy || !selectedTemplate || !name.trim() || !description.trim()}
          onClick={handleCreate}
        >
          {busy ? "创建中..." : "创建并进入编辑"}
        </button>
      </div>
    </div>
  );
}

export default function TopicCreatePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl p-6 text-sm text-muted-foreground">Loading...</div>}>
      <TopicCreatePageClient />
    </Suspense>
  );
}
