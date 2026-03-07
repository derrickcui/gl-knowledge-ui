"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  createTopic,
  fetchTopics,
  TopicDTO,
  submitTopicReview,
  fetchTopicReviews,
  publishTopic,
} from "@/lib/topic-api";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { t } from "@/i18n";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

export const dynamic = "force-dynamic";

const TOPIC_LIST_TTL_MS = 30_000;
const topicListCache: {
  data: TopicDTO[] | null;
  error: string | null;
  ts: number;
  promise: Promise<{ data: TopicDTO[]; error: string | null }> | null;
} = {
  data: null,
  error: null,
  ts: 0,
  promise: null,
};

function invalidateTopicListCache() {
  topicListCache.data = null;
  topicListCache.error = null;
  topicListCache.ts = 0;
  topicListCache.promise = null;
}

async function fetchTopicsCached(options?: { force?: boolean }) {
  const now = Date.now();
  if (options?.force) {
    invalidateTopicListCache();
  }
  const fresh =
    topicListCache.data && now - topicListCache.ts < TOPIC_LIST_TTL_MS;
  if (fresh) {
    return {
      data: topicListCache.data ?? [],
      error: topicListCache.error,
    };
  }
  if (topicListCache.promise) {
    return topicListCache.promise;
  }
  topicListCache.promise = (async () => {
    const res = await fetchTopics();
    if (res.error) {
      const payload = { data: [], error: res.error };
      topicListCache.error = res.error;
      topicListCache.ts = now;
      return payload;
    }
    const data = res.data?.items ?? [];
    topicListCache.data = data;
    topicListCache.error = null;
    topicListCache.ts = now;
    return { data, error: null };
  })();
  try {
    return await topicListCache.promise;
  } finally {
    topicListCache.promise = null;
  }
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

function normalizeStatus(status: string) {
  return String(status ?? "").trim().toUpperCase();
}

function getStatusClass(status: string) {
  const normalized = normalizeStatus(status);
  return STATUS_STYLES[normalized] ?? "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "DRAFT") return t("topics.status.draft");
  if (normalized === "IN_REVIEW") return t("topics.status.inReview");
  if (normalized === "APPROVED") return t("topics.status.published");
  if (normalized === "REJECTED") return t("topics.status.rejected");
  if (normalized === "PUBLISHED") return t("topics.status.published");
  return status;
}

function formatUsedBy(usedBy?: string[] | null) {
  if (!usedBy || usedBy.length === 0) return "-";
  return usedBy.join(", ");
}

function formatUpdatedAt(updatedAt?: string | null) {
  if (!updatedAt) return "-";
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return updatedAt;
  return parsed.toISOString().slice(0, 10);
}

function TopicsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mountedRef = useRef(true);
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<RuleTemplateItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingReviewTopic, setPendingReviewTopic] =
    useState<TopicDTO | null>(null);

  async function loadTopics(showLoading = true, force = false) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    const result = await fetchTopicsCached({ force });
    if (!mountedRef.current) return;
    if (result.data) {
      setTopics(result.data);
    } else {
      setError(result.error ?? "Unable to load topics.");
    }
    if (showLoading) {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadTopics();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (searchParams.get("refresh")) {
      loadTopics(false, true);
      router.replace("/knowledge/topics");
      return;
    }
    if (searchParams.get("fromReview")) {
      loadTopics(false, true);
    }
  }, [searchParams, router]);

  const filteredTopics = useMemo(() => {
    const nextQuery = query.trim().toLowerCase();
    if (!nextQuery) return topics;
    return topics.filter((topic) =>
      topic.name.toLowerCase().includes(nextQuery)
    );
  }, [query, topics]);

  function handleRowActivate(topicId: string) {
    router.push(`/knowledge/topics/${encodeURIComponent(topicId)}`);
  }

  function handleSubmitReview(topic: TopicDTO) {
    setPendingReviewTopic(topic);
    setReviewDialogOpen(true);
  }

  async function handlePublishFromList(topic: TopicDTO) {
    const reviewsResult = await fetchTopicReviews(topic.id);
    if (!reviewsResult.data || reviewsResult.data.length === 0) {
      setActionFeedback({
        type: "error",
        title: t("topics.publish.failedTitle"),
        message: t("topics.publish.missingReview"),
      });
      return;
    }
    const latest = [...reviewsResult.data].sort(
      (a, b) => b.revision - a.revision
    )[0];
    let expectedHash: string | null = null;
    try {
      const packet = await fetchReviewPacketBusiness(
        String(latest.reviewId)
      );
      expectedHash = packet?.contentHash ?? null;
    } catch {
      expectedHash = null;
    }
    if (!expectedHash) {
      setActionFeedback({
        type: "error",
        title: t("topics.publish.failedTitle"),
        message: t("topics.publish.missingHash"),
      });
      return;
    }
    const result = await publishTopic(topic.id, {
      publisher: "systemUser",
      expectedHash,
    });
    if (result.data) {
      setTopics((prev) =>
        prev.map((item) =>
          item.id === topic.id
            ? {
                ...item,
                status: "PUBLISHED",
                updatedAt: result.data?.publishedAt ?? item.updatedAt,
              }
            : item
        )
      );
      invalidateTopicListCache();
      setActionFeedback({
        type: "success",
        title: t("topics.publish.successTitle"),
      });
      await loadTopics(false, true);
    } else {
      setActionFeedback({
        type: "error",
        title: t("topics.publish.failedTitle"),
        message: result.error ?? t("topics.publish.failedMessage"),
      });
    }
  }

  async function handleReviewConfirm() {
    if (!pendingReviewTopic) return;
    const result = await submitTopicReview(pendingReviewTopic.id, {});
    if (result.data) {
      setActionFeedback({
        type: "success",
        title: t("topics.review.submitSuccess"),
      });
      invalidateTopicListCache();
      await loadTopics(false, true);
      setReviewDialogOpen(false);
      setPendingReviewTopic(null);
      router.push(
        `/knowledge/topics/${encodeURIComponent(
          pendingReviewTopic.id
        )}/reviews/${result.data.revision}`
      );
    } else {
      setActionFeedback({
        type: "error",
        title: t("topics.review.submitFailed"),
        message: result.error ?? t("topics.review.submitFailedMessage"),
      });
    }
  }

  function handleRollback(topic: TopicDTO) {
    setActionFeedback({
      type: "info",
      title: t("topics.actions.rollbackSelected", { name: topic.name }),
      message: t("topics.actions.rollbackUnavailable"),
    });
  }


  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {t("topics.list.title")}
          </h1>
          <p className="text-sm opacity-70">
            {t("topics.list.subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => setTemplateDialogOpen(true)}
        >
          {t("topics.list.create")}
        </button>
      </div>

      {error && <FeedbackBanner type="error" title={error} />}
      {actionFeedback && (
        <FeedbackBanner
          type={actionFeedback.type}
          title={actionFeedback.title}
          message={actionFeedback.message}
          onDismiss={() => setActionFeedback(null)}
        />
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          placeholder="Search topics"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm opacity-60">Loading...</div>
      ) : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b px-3 py-2 text-left">
                  {t("topics.list.columns.name")}
                </th>
                <th className="border-b px-3 py-2 text-left">
                  {t("topics.list.columns.status")}
                </th>
                <th className="border-b px-3 py-2 text-left">
                  {t("topics.list.columns.actions")}
                </th>
                <th className="border-b px-3 py-2 text-left">
                  {t("topics.list.columns.usedBy")}
                </th>
                <th className="border-b px-3 py-2 text-left">
                  {t("topics.list.columns.updatedAt")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="hover:bg-muted/60">
                  <td className="border-b px-3 py-2">
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => handleRowActivate(topic.id)}
                    >
                      {topic.name}
                    </button>
                  </td>
                  <td className="border-b px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(
                        topic.status
                      )}`}
                    >
                      {getStatusLabel(topic.status)}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {(normalizeStatus(topic.status) === "DRAFT" ||
                        normalizeStatus(topic.status) === "REJECTED") && (
                        <>
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs"
                          onClick={() => handleRowActivate(topic.id)}
                        >
                            {t("topics.actions.edit")}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-black px-2 py-0.5 text-xs text-white"
                          onClick={() => handleSubmitReview(topic)}
                        >
                            {t("topics.actions.submitReview")}
                        </button>
                        </>
                      )}
                      {normalizeStatus(topic.status) === "IN_REVIEW" && (
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs"
                          onClick={async () => {
                            const result = await fetchTopicReviews(topic.id);
                            if (!result.data || result.data.length === 0) {
                              setActionFeedback({
                                type: "error",
                                title: t("topics.review.fetchFailedTitle"),
                                message:
                                  result.error ??
                                  t("topics.review.fetchFailedMessage"),
                              });
                              return;
                            }
                            const latest = [...result.data].sort(
                              (a, b) => b.revision - a.revision
                            )[0];
                            router.push(
                              `/knowledge/topics/${encodeURIComponent(
                                topic.id
                              )}/reviews/${latest.revision}`
                            );
                          }}
                        >
                          {t("topics.actions.view")}
                        </button>
                      )}
                      {normalizeStatus(topic.status) === "APPROVED" && (
                        <>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => handleRowActivate(topic.id)}
                          >
                            {t("topics.actions.view")}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-black px-2 py-0.5 text-xs text-white"
                            onClick={() => handlePublishFromList(topic)}
                          >
                            {t("topics.actions.publish")}
                          </button>
                        </>
                      )}
                      {normalizeStatus(topic.status) === "PUBLISHED" && (
                        <>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => handleRowActivate(topic.id)}
                          >
                            {t("topics.actions.view")}
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => handleRollback(topic)}
                          >
                            {t("topics.actions.rollback")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="border-b px-3 py-2">
                    {formatUsedBy(topic.usedBy)}
                  </td>
                  <td className="border-b px-3 py-2">
                    {formatUpdatedAt(topic.updatedAt)}
                  </td>
                </tr>
              ))}

              {!filteredTopics.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-sm opacity-60"
                  >
                    No topics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateTopicDialog
        open={createOpen}
        loading={createLoading}
        name={createName}
        description={createDescription}
        template={selectedTemplate}
        onChangeName={setCreateName}
        onChangeDescription={setCreateDescription}
        onBack={() => {
          setCreateOpen(false);
          setTemplateDialogOpen(true);
        }}
        onCancel={() => {
          setCreateOpen(false);
          setCreateName("");
          setCreateDescription("");
          setCreateError(null);
          setSelectedTemplate(null);
        }}
        onCreate={async () => {
          if (!createName.trim() || !createDescription.trim()) return;
          if (!selectedTemplate) return;
          setCreateLoading(true);
          setCreateError(null);
          const result = await createTopic({
            name: createName.trim(),
            description: createDescription.trim() || undefined,
            template: selectedTemplate.id,
          });
          if (result.data) {
            await loadTopics(false);
            setCreateLoading(false);
            setCreateOpen(false);
            setCreateName("");
            setCreateDescription("");
            setSelectedTemplate(null);
            router.push(
              `/knowledge/topics/${encodeURIComponent(
                result.data.id
              )}`
            );
            return;
          }
          setCreateLoading(false);
          setCreateError(
            result.error ?? "Unable to create topic."
          );
        }}
        error={createError}
      />
      <SubmitReviewDialog
        open={reviewDialogOpen}
        topic={pendingReviewTopic}
        onCancel={() => {
          setReviewDialogOpen(false);
          setPendingReviewTopic(null);
        }}
        onConfirm={handleReviewConfirm}
      />
      <SelectTemplateDialog
        open={templateDialogOpen}
        onCancel={() => {
          setTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        onNext={(template) => {
          setSelectedTemplate(template);
          setTemplateDialogOpen(false);
          setCreateOpen(true);
        }}
      />
    </div>
  );
}

function CreateTopicDialog({
  open,
  loading,
  name,
  description,
  template,
  onChangeName,
  onChangeDescription,
  onBack,
  onCancel,
  onCreate,
  error,
}: {
  open: boolean;
  loading: boolean;
  name: string;
  description: string;
  template: RuleTemplateItem | null;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
  error: string | null;
}) {
  const createDialogDrag = useDraggableDialog(open);
  if (!open) return null;

  const canCreate =
    !!template &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-lg bg-white p-6 shadow-xl" style={createDialogDrag.style}>
        <div
          className={`select-none ${createDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          {...createDialogDrag.handleProps}
        >
          <div className="text-base font-semibold">
            {t("topics.create.basic.title")}
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {t("topics.create.basic.selectedTemplate", {
            name: template
              ? template.name
              : t("topics.create.basic.none"),
          })}
        </div>
        {error && (
          <div className="mt-3">
            <FeedbackBanner type="error" title={error} />
          </div>
        )}
        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("topics.create.basic.nameLabel")}
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder={t("topics.create.basic.namePlaceholder")}
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("topics.create.basic.descriptionLabel")}
            </label>
            <textarea
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t("topics.create.basic.descriptionPlaceholder")}
              value={description}
              onChange={(event) =>
                onChangeDescription(event.target.value)
              }
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onBack}
            disabled={loading}
          >
            {t("topics.create.basic.back")}
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {t("topics.create.basic.cancel")}
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-60"
            onClick={onCreate}
            disabled={!canCreate}
          >
            {loading
              ? t("topics.create.basic.creating")
              : t("topics.create.basic.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmitReviewDialog({
  open,
  topic,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  topic: TopicDTO | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const reviewDialogDrag = useDraggableDialog(open);
  if (!open || !topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl" style={reviewDialogDrag.style}>
        <div
          className={`select-none ${reviewDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          {...reviewDialogDrag.handleProps}
        >
          <h3 className="text-base font-semibold">
            {t("topics.review.confirmTitle")}
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("topics.review.confirmHint")}
        </p>
        <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">{topic.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("topics.review.currentStatus", {
              status: getStatusLabel(topic.status),
            })}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("topics.review.nextStatus", {
              status: t("topics.status.inReview"),
            })}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
          >
            {t("topics.review.cancel")}
          </button>
          <button
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
            onClick={onConfirm}
          >
            {t("topics.review.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectTemplateDialog({
  open,
  onCancel,
  onNext,
}: {
  open: boolean;
  onCancel: () => void;
  onNext: (template: RuleTemplateItem) => void;
}) {
  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | string | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    async function loadPublished() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTemplatesList({ status: "PUBLISHED" });
        if (res.error) throw new Error(res.error);
        if (!mounted) return;
        const list = res.data ?? [];
        setTemplates(list);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "Unable to load templates.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPublished();
    return () => {
      mounted = false;
    };
  }, [open]);

  const templateDialogDrag = useDraggableDialog(open);
  if (!open) return null;

  const filtered = templates.filter((tpl) => {
    const text = `${tpl.name ?? ""} ${tpl.description ?? ""}`
      .toLowerCase()
      .trim();
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return text.includes(needle);
  });

  const selectedTemplate =
    templates.find((tpl) => String(tpl.id) === String(selectedId)) ?? null;
  const canProceed = !!selectedTemplate && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[640px] rounded-lg bg-white p-6 shadow-xl" style={templateDialogDrag.style}>
        <div
          className={`select-none ${templateDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
          {...templateDialogDrag.handleProps}
        >
          <div className="text-base font-semibold">
            {t("topics.create.selectTemplate.title")}
          </div>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {t("topics.create.selectTemplate.subtitle")}
        </div>

        <div className="mt-4">
          <input
            type="text"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            placeholder={t("topics.create.selectTemplate.searchPlaceholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="text-sm opacity-60">
              {t("topics.create.selectTemplate.loading")}
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-sm opacity-60">
              {t("topics.create.selectTemplate.empty")}
            </div>
          )}
          {!loading &&
            !error &&
            filtered.map((tpl) => (
              <button
                key={String(tpl.id)}
                className={`w-full text-left rounded-md border p-3 ${
                  selectedId === tpl.id ? "ring-2 ring-black" : ""
                }`}
                onClick={() => setSelectedId(tpl.id)}
              >
                <div className="font-medium">{tpl.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {tpl.description ?? ""}
                </div>
              </button>
            ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            {t("topics.create.selectTemplate.cancel")}
          </button>
          <button
            type="button"
            className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
            onClick={() => selectedTemplate && onNext(selectedTemplate)}
            disabled={!canProceed}
          >
            {t("topics.create.selectTemplate.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TopicsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <TopicsPageClient />
    </Suspense>
  );
}

