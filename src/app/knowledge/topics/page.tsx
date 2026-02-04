"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  createTopic,
  fetchTopics,
  TopicDTO,
  saveTopicDraft,
  submitTopicReview,
  fetchTopicReviews,
  publishTopic,
} from "@/lib/topic-api";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { normalizeForRuleBuilder, createScenario } from "@/components/rule-builder/ruleGroupOps";
import { ruleNodeToBusinessRule } from "@/lib/business-rule";
import { RuleNode } from "@/components/rule-builder/astTypes";

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

async function fetchTopicsCached() {
  const now = Date.now();
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
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "\u8349\u7a3f",
  IN_REVIEW: "\u5f85\u8bc4\u5ba1",
  APPROVED: "\u5df2\u5ba1\u6279",
  REJECTED: "\u88ab\u9000\u56de",
  PUBLISHED: "\u5df2\u53d1\u5e03",
};

function normalizeStatus(status: string) {
  return String(status ?? "").trim().toUpperCase();
}

function getStatusClass(status: string) {
  const normalized = normalizeStatus(status);
  return STATUS_STYLES[normalized] ?? "bg-gray-100 text-gray-700";
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

function extractTemplateVersion(
  template: RuleTemplateItem | null,
  config?: any | null
) {
  if (!template && !config) return null;
  const normalizedConfig = config?.config ?? config?.data ?? config;
  return (
    template?.version ??
    template?.templateVersion ??
    template?.revision ??
    template?.rev ??
    template?.publishedVersion ??
    template?.configVersion ??
    normalizedConfig?.version ??
    null
  );
}

function extractTemplateCapabilities(config: any): string {
  if (!config) return "";
  const normalized = config?.config ?? config?.data ?? config;
  const caps = normalized.capabilities ?? normalized.features ?? null;
  if (Array.isArray(caps)) {
    return caps.filter(Boolean).join("、");
  }
  if (typeof caps === "string") return caps;

  const allowedModes =
    normalized.allowedModes ?? normalized.allowed_modes ?? null;
  const importanceAllowed =
    normalized.importanceAllowed ??
    normalized.importance_allowed ??
    normalized.allowImportance ??
    false;
  const positionRules =
    normalized.positionRules ?? normalized.position_rules ?? null;

  const parts: string[] = [];
  if (allowedModes && typeof allowedModes === "object") {
    const modeLabels: string[] = [];
    if (allowedModes.all) modeLabels.push("全部满足/任一满足");
    if (allowedModes.partial) modeLabels.push("满足部分条件");
    if (allowedModes.weighted)
      modeLabels.push("满足部分条件并综合重要性判断");
    if (modeLabels.length === 1) {
      parts.push(`仅支持“${modeLabels[0]}”`);
    } else if (modeLabels.length > 1) {
      parts.push(`支持“${modeLabels.join(" / ")}”`);
    }
  } else if (
    "allowAll" in normalized ||
    "allowAccrue" in normalized ||
    "allowLogsum" in normalized
  ) {
    const modeLabels: string[] = [];
    if (normalized.allowAll) modeLabels.push("全部满足/任一满足");
    if (normalized.allowAccrue) modeLabels.push("满足部分条件");
    if (normalized.allowLogsum)
      modeLabels.push("满足部分条件并综合重要性判断");
    if (modeLabels.length === 1) {
      parts.push(`仅支持“${modeLabels[0]}”`);
    } else if (modeLabels.length > 1) {
      parts.push(`支持“${modeLabels.join(" / ")}”`);
    }
  }

  if (importanceAllowed) {
    parts.push("支持“条件重要性”");
  }

  if (positionRules && typeof positionRules === "object") {
    const positionLabels: Record<string, string> = {
      paragraph: "同一段",
      sentence: "同一句",
      order: "前后顺序",
      near: "彼此附近",
    };
    const enabled = Object.entries(positionRules)
      .filter(([key, value]) => key !== "any" && Boolean(value))
      .map(([key]) => positionLabels[key] ?? key);
    if (enabled.length) {
      parts.push(`支持“位置关系（${enabled.join(" / ")}）”`);
    }
  } else if (
    normalized.allowProximity ||
    normalized.allowOrder ||
    normalized.allowSentence ||
    normalized.allowParagraph
  ) {
    const enabled: string[] = [];
    if (normalized.allowSentence) enabled.push("同一句");
    if (normalized.allowParagraph) enabled.push("同一段");
    if (normalized.allowOrder) enabled.push("前后顺序");
    if (normalized.allowProximity) enabled.push("彼此附近");
    if (enabled.length) {
      parts.push(`支持“位置关系（${enabled.join(" / ")}）”`);
    }
  }

  return parts.join("；");
}

export default function TopicsPage() {
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
  const [selectedTemplateVersion, setSelectedTemplateVersion] =
    useState<number | string | null>(null);
  const [templateConfigs, setTemplateConfigs] = useState<
    Record<string, any | null>
  >({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingReviewTopic, setPendingReviewTopic] =
    useState<TopicDTO | null>(null);

  function buildDefaultRule(): RuleNode {
    return normalizeForRuleBuilder({
      type: "GROUP",
      params: { operator: "ANY", role: "RULE", sticky: true },
      children: [createScenario(0)],
    });
  }

  async function loadTopics(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    const result = await fetchTopicsCached();
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
    if (searchParams.get("fromReview")) {
      loadTopics(false);
    }
  }, [searchParams]);

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

  function getStatusLabel(status: string) {
    const normalized = normalizeStatus(status);
    return STATUS_LABELS[normalized] ?? status;
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
        title: "\u53d1\u5e03\u5931\u8d25",
        message: "\u672a\u627e\u5230\u8bc4\u5ba1\u8bb0\u5f55\uff0c\u65e0\u6cd5\u83b7\u53d6\u53d1\u5e03\u54c8\u5e0c\u3002",
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
        title: "\u53d1\u5e03\u5931\u8d25",
        message: "\u672a\u83b7\u53d6\u5230\u8bc4\u5ba1\u54c8\u5e0c\uff0c\u65e0\u6cd5\u53d1\u5e03\u3002",
      });
      return;
    }
    const result = await publishTopic(topic.id, {
      publisher: "systemUser",
      expectedHash,
    });
    if (result.data) {
      setActionFeedback({
        type: "success",
        title: "\u5df2\u53d1\u5e03",
      });
      await loadTopics(false);
    } else {
      setActionFeedback({
        type: "error",
        title: "\u53d1\u5e03\u5931\u8d25",
        message: result.error ?? "\u65e0\u6cd5\u53d1\u5e03\u89c4\u5219\u3002",
      });
    }
  }

  async function handleReviewConfirm() {
    if (!pendingReviewTopic) return;
    const result = await submitTopicReview(pendingReviewTopic.id, {});
    if (result.data) {
      setActionFeedback({
        type: "success",
        title: "已提交评审",
      });
      await loadTopics(false);
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
        title: "提交评审失败",
        message: result.error ?? "无法提交评审。",
      });
    }
  }

  function handleRollback(topic: TopicDTO) {
    setActionFeedback({
      type: "info",
      title: `已选择回滚：${topic.name}`,
      message: "回滚功能尚未接入后端。",
    });
  }


  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Topics</h1>
          <p className="text-sm opacity-70">
            Quickly see which topics exist and where they are used.
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => setTemplateDialogOpen(true)}
        >
          + New Topic
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
                  Topic Name
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Status
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Actions
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Used By
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Updated At
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
                            {"\u7f16\u8f91"}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-black px-2 py-0.5 text-xs text-white"
                            onClick={() => handleSubmitReview(topic)}
                          >
                            {"\u63d0\u4ea4\u8bc4\u5ba1"}
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
                                title: "\u65e0\u6cd5\u83b7\u53d6\u8bc4\u5ba1\u8bb0\u5f55",
                                message:
                                  result.error ??
                                  "\u8be5\u89c4\u5219\u6682\u65e0\u53ef\u7528\u8bc4\u5ba1\u8bb0\u5f55\u3002",
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
                          {"\u67e5\u770b"}
                        </button>
                      )}
                      {normalizeStatus(topic.status) === "APPROVED" && (
                        <>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => handleRowActivate(topic.id)}
                          >
                            {"\u67e5\u770b"}
                          </button>
                          <button
                            type="button"
                            className="rounded bg-black px-2 py-0.5 text-xs text-white"
                            onClick={() => handlePublishFromList(topic)}
                          >
                            {"\u53d1\u5e03"}
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
                            {"\u67e5\u770b"}
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => handleRollback(topic)}
                          >
                            {"\u56de\u6eda"}
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
        templateVersion={selectedTemplateVersion}
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
          setSelectedTemplateVersion(null);
        }}
        onCreate={async () => {
          if (!createName.trim() || !createDescription.trim()) return;
          if (!selectedTemplate) return;
          setCreateLoading(true);
          setCreateError(null);
          const result = await createTopic({
            name: createName.trim(),
            description: createDescription.trim() || undefined,
            templateId: selectedTemplate.id,
            templateVersion: selectedTemplateVersion,
          });
          if (result.data) {
            const draftRule = ruleNodeToBusinessRule(
              buildDefaultRule()
            );
            const draftResult = await saveTopicDraft(
              result.data.id,
              { rule: draftRule }
            );
            if (!draftResult.data) {
              setCreateLoading(false);
              setCreateError(
                draftResult.error ??
                  "Unable to initialize topic draft."
              );
              return;
            }
            await loadTopics(false);
            setCreateLoading(false);
            setCreateOpen(false);
            setCreateName("");
            setCreateDescription("");
            setSelectedTemplate(null);
            setSelectedTemplateVersion(null);
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
        templateConfigs={templateConfigs}
        onConfigsLoaded={setTemplateConfigs}
        onCancel={() => {
          setTemplateDialogOpen(false);
          setSelectedTemplate(null);
        }}
        onNext={(template) => {
          setSelectedTemplate(template);
          setSelectedTemplateVersion(
            extractTemplateVersion(
              template,
              templateConfigs[String(template.id)]
            )
          );
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
  templateVersion,
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
  templateVersion: number | string | null;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
  error: string | null;
}) {
  if (!open) return null;

  const canCreate =
    !!template &&
    !!templateVersion &&
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-lg bg-white p-6 shadow-xl">
        <div className="text-base font-semibold">新建主题 · 基本信息</div>
        <div className="mt-2 text-sm text-muted-foreground">
          已选模板：{template ? template.name : "（无）"}
          {template && templateVersion
            ? ` · 版本 ${templateVersion}`
            : ""}
        </div>
        {error && (
          <div className="mt-3">
            <FeedbackBanner type="error" title={error} />
          </div>
        )}
        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">主题名称*</label>
            <input
              type="text"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="填写主题名称"
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">业务说明*</label>
            <textarea
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="说明这个主题用于什么"
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
            上一步
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-60"
            onClick={onCreate}
            disabled={!canCreate}
          >
            {loading ? "创建中..." : "创建并进入"}
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
  if (!open || !topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold">
          确认提交评审？
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          提交后规则将进入评审流程，在评审完成前将无法修改。
        </p>
        <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="font-medium">{topic.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            当前状态：{STATUS_LABELS[topic.status] ?? topic.status}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            提交后状态：待评审
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
            onClick={onConfirm}
          >
            确认提交
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectTemplateDialog({
  open,
  templateConfigs,
  onConfigsLoaded,
  onCancel,
  onNext,
}: {
  open: boolean;
  templateConfigs: Record<string, any | null>;
  onConfigsLoaded: (next: Record<string, any | null>) => void;
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
        const configEntries = await Promise.all(
          list.map(async (tpl) => {
            try {
              const resp = await fetch(
                `/api/templates/${encodeURIComponent(
                  String(tpl.id)
                )}/config`,
                { cache: "no-store" }
              );
              if (!resp.ok) return [String(tpl.id), null] as const;
              const json = await resp.json();
              return [String(tpl.id), json?.data ?? json] as const;
            } catch {
              return [String(tpl.id), null] as const;
            }
          })
        );
        if (!mounted) return;
        const nextConfigs: Record<string, any | null> = {};
        configEntries.forEach(([id, cfg]) => {
          nextConfigs[id] = cfg ?? null;
        });
        onConfigsLoaded(nextConfigs);
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

  if (!open) return null;

  const filtered = templates.filter((tpl) => {
    const text = `${tpl.name ?? ""} ${tpl.purpose ?? ""} ${tpl.description ?? ""}`
      .toLowerCase()
      .trim();
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return text.includes(needle);
  });

  const selectedTemplate =
    templates.find((tpl) => String(tpl.id) === String(selectedId)) ?? null;
  const selectedVersion = extractTemplateVersion(
    selectedTemplate,
    templateConfigs[String(selectedTemplate?.id ?? "")]
  );
  const canProceed = !!selectedTemplate && !!selectedVersion && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[640px] rounded-lg bg-white p-6 shadow-xl">
        <div className="text-base font-semibold">新建主题 · 选择模板</div>
        <div className="mt-2 text-sm text-muted-foreground">
          选择一个标准模板开始创建主题（可减少配置步骤）
        </div>

        <div className="mt-4">
          <input
            type="text"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            placeholder="搜索模板…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="text-sm opacity-60">加载中...</div>
          )}
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-sm opacity-60">暂无已发布模板</div>
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
                  {tpl.purpose ?? tpl.description ?? ""}
                </div>
                {extractTemplateCapabilities(
                  templateConfigs[String(tpl.id)]
                ) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    能力：
                    {extractTemplateCapabilities(
                      templateConfigs[String(tpl.id)]
                    )}
                  </div>
                )}
                {extractTemplateVersion(
                  tpl,
                  templateConfigs[String(tpl.id)]
                ) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    版本{" "}
                    {extractTemplateVersion(
                      tpl,
                      templateConfigs[String(tpl.id)]
                    )}
                  </div>
                )}
              </button>
            ))}
        </div>

        {selectedTemplate && !selectedVersion && (
          <div className="mt-3 text-xs text-amber-600">
            该模板缺少版本信息，无法用于创建主题。
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="button"
            className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
            onClick={() => selectedTemplate && onNext(selectedTemplate)}
            disabled={!canProceed}
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}
