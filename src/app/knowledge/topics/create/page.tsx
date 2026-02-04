"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createTopic, saveTopicDraft } from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export default function TopicCreateWithTemplatePage() {
  const search = useSearchParams();
  const router = useRouter();

  const templateId = search.get("templateId");
  const templateVersion = search.get("templateVersion");
  const initName = search.get("name") ?? "";
  const initDesc = search.get("description") ?? "";

  const [name, setName] = useState(initName);
  const [description, setDescription] = useState(initDesc);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initName);
    setDescription(initDesc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!name.trim() || !description.trim()) return;
    if (!templateId || !templateVersion) {
      setError("请先选择已发布模板。");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createTopic({
        name: name.trim(),
        description: description.trim() || undefined,
        templateId: templateId,
        templateVersion: templateVersion,
      });
      if (res.data) {
        // apply template to draft when available
        if (templateId) {
          try {
            const tplRes = await fetch(`/api/templates`, { cache: "no-store" });
            if (tplRes.ok) {
              const tplJson = await tplRes.json();
              const items = tplJson.items ?? tplJson ?? [];
              const found = (items as any[]).find(
                (t) => String(t.id) === String(templateId)
              );
              const rule =
                found?.rule ?? found?.initialRule ?? found?.templateRule ?? found?.config?.rule ?? null;
              if (rule) {
                // attempt to save draft using template rule
                // ignore result if fails
                try {
                  await saveTopicDraft(res.data.id, {
                    rule,
                    templateId,
                    templateVersion,
                  });
                } catch {
                  // swallow
                }
              }
            }
          } catch {
            // ignore template fetch errors
          }
        }
        // created -> go to topic page
        router.push(`/knowledge/topics/${encodeURIComponent(res.data.id)}`);
      } else {
        setError(res.error ?? "创建失败");
      }
    } catch (e: any) {
      setError(e?.message ?? "创建失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-lg font-semibold">新建主题 · 基本信息</h1>
      <div className="mt-3 text-sm">
        已选模板：{templateId ? `模板 #${templateId}` : "（无）"}
        {templateId && templateVersion ? ` · 版本 ${templateVersion}` : ""}
      </div>

      {error && <FeedbackBanner type="error" title={error} />}

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-sm font-medium">主题名称*</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">业务说明*</label>
          <textarea
            className="mt-1 w-full min-h-[80px] rounded-md border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => router.push("/knowledge/topics/create/select-template")}
          disabled={busy}
        >
          上一步
        </button>
        <button
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
          onClick={handleCreate}
          disabled={
            busy ||
            !name.trim() ||
            !description.trim() ||
            !templateId ||
            !templateVersion
          }
        >
          创建并进入
        </button>
      </div>
    </div>
  );
}
