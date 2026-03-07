"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { t } from "@/i18n";
import { createTopicSet, listTopicSets, TopicSetSummary } from "@/lib/topicset-api";

type FeedbackState = {
  type: "error" | "success" | "info";
  title: string;
  message?: string;
} | null;

export default function TopicSetsPage() {
  const router = useRouter();
  const [items, setItems] = useState<TopicSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNamespace, setCreateNamespace] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  async function loadTopicSets() {
    setLoading(true);
    const result = await listTopicSets();
    setLoading(false);
    if (!result.data) {
      setFeedback({
        type: "error",
        title: t("topicSet.list.loadFailed"),
        message: result.error ?? t("topicSet.list.loadFailed"),
      });
      return;
    }
    setItems(result.data);
  }

  useEffect(() => {
    loadTopicSets();
  }, []);

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("topicSet.list.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("topicSet.list.subtitle")}</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white"
          onClick={() => setCreateOpen(true)}
        >
          {t("topicSet.list.create")}
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

      <div className="overflow-auto rounded-lg border bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-3 py-2">{t("topicSet.list.columnName")}</th>
              <th className="px-3 py-2">{t("topicSet.list.columnNamespace")}</th>
              <th className="px-3 py-2">{t("topicSet.list.columnStatus")}</th>
              <th className="px-3 py-2">{t("topicSet.workspace.versionLabel")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  {t("common.loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={4}>
                  {t("topicSet.list.empty")}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
                  onClick={() => router.push(`/knowledge/topicsets/${encodeURIComponent(item.id)}`)}
                >
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">{item.namespace || "-"}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2">v{item.version}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.list.createDialogTitle")}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm">{t("topicSet.list.columnName")}</label>
                <input
                  className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
                  value={createName}
                  onChange={(event) => setCreateName(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">{t("topicSet.list.columnNamespace")}</label>
                <input
                  className="mt-1 h-9 w-full rounded-md border px-3 text-sm"
                  value={createNamespace}
                  onChange={(event) => setCreateNamespace(event.target.value)}
                />
              </div>
              <div>
                <label className="text-sm">{t("topicSet.detail.description")}</label>
                <textarea
                  className="mt-1 h-20 w-full rounded-md border px-3 py-2 text-sm"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setCreateOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={createLoading || !createName.trim()}
                onClick={async () => {
                  setCreateLoading(true);
                  const result = await createTopicSet({
                    name: createName.trim(),
                    namespace: createNamespace.trim() || null,
                    description: createDescription.trim() || null,
                  });
                  setCreateLoading(false);
                  if (!result.data) {
                    setFeedback({
                      type: "error",
                      title: t("topicSet.list.createFailed"),
                      message: result.error ?? t("topicSet.list.createFailed"),
                    });
                    return;
                  }
                  setCreateOpen(false);
                  router.push(`/knowledge/topicsets/${encodeURIComponent(result.data.id)}`);
                }}
              >
                {createLoading ? t("topicSet.common.creating") : t("topicSet.common.create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

