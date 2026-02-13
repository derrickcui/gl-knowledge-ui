"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  fetchTopicById,
  fetchTopicDraft,
  publishTopic,
  previewTopicRule,
  saveTopicDraft,
  deleteTopicDraft,
  submitTopicReview,
  fetchTopicReviews,
  type ExplainPreviewViewModel,
} from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import FromReviewBanner from "@/components/review/FromReviewBanner";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import { RuleEditor } from "./rule-editor";
import type { UiRuleViewModel, UiCapabilityViewModel } from "./rule-editor/types";
import { t } from "@/i18n";
import { normalizeRootForSave } from "./rule-editor/save-normalize";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

function hasDraftPayload(
  payload: unknown
): payload is {
  rule: UiRuleViewModel;
  capability: UiCapabilityViewModel;
  explain?: ExplainPreviewViewModel;
} {
  if (!payload || typeof payload !== "object") return false;
  const item = payload as Record<string, unknown>;
  if (!("rule" in item) || !("capability" in item)) return false;
  const rule = item.rule as Record<string, unknown> | null;
  const capability = item.capability as Record<string, unknown> | null;
  return Boolean(rule && typeof rule === "object" && "root" in rule && capability && typeof capability === "object");
}

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [topicName, setTopicName] = useState<string>(t("common.topic"));
  const [topicStatus, setTopicStatus] = useState("DRAFT");
  const [templateLabel, setTemplateLabel] = useState<string | undefined>(undefined);
  const [reviewReason, setReviewReason] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewGql, setPreviewGql] = useState<string>("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewDialogDrag = useDraggableDialog(previewDialogOpen);
  const [editorState, setEditorState] = useState<{
    rule: UiRuleViewModel;
    capability: UiCapabilityViewModel;
    explain: ExplainPreviewViewModel | null;
    dirty: boolean;
  } | null>(null);

  async function handleSaveDraft() {
    if (!topicId || topicStatus === "IN_REVIEW" || !editorState) return;
    setActionBusy(true);
    setActionFeedback(null);
    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const normalizedOnSave =
      JSON.stringify(editorState.rule.root) !== JSON.stringify(normalizedRoot);

    const result = await saveTopicDraft(topicId, {
      rule: { root: normalizedRoot },
    });

      if (result.data) {
        if (!hasDraftPayload(result.data)) {
          setActionFeedback({
            type: "error",
            title: t("topicDetail.draft.saveFailed"),
            message: "ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â¨Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚Â¿ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¥ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¾ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚Â¼ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¼Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚Â¯Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â³Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚ÂÃƒâ€¦Ã‚Â½ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â«Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‚Â¦Ãƒâ€šÃ‚Â£ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¥ draft API ÃƒÆ’Ã‚Â¥ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚ÂºÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¾ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â£ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡",
          });
        } else {
          setEditorState({
            rule: result.data.rule,
            capability: result.data.capability,
            explain: result.data.explain ?? null,
            dirty: false,
          });
        }
        setActionFeedback({
          type: "success",
          title: t("topicDetail.draft.saved"),
          message: normalizedOnSave ? t("topicDetail.draft.normalized") : undefined,
        });
      } else {
        setActionFeedback({
          type: "error",
          title: t("topicDetail.draft.saveFailed"),
          message:
            result.error ??
            t("topicDetail.draft.saveFailedMessage"),
        });
      }

    setActionBusy(false);
  }

  async function handleDeleteDraft() {
    if (!topicId || topicStatus === "IN_REVIEW") return;
    setActionBusy(true);
    setActionFeedback(null);

    const result = await deleteTopicDraft(topicId);
    if (result.error) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.draft.deleteFailed"),
        message: result.error,
      });
    } else {
      setActionFeedback({
        type: "success",
        title: t("topicDetail.draft.deleted"),
      });
      router.push("/knowledge/topics?refresh=1");
    }

    setActionBusy(false);
  }

  async function handleSubmitReview() {
    if (!topicId || topicStatus === "IN_REVIEW") return;
    setActionBusy(true);
    setActionFeedback(null);

    const result = await submitTopicReview(topicId, {});
    if (result.data) {
      setTopicStatus("IN_REVIEW");
      setActionFeedback({
        type: "success",
        title: t("topicDetail.review.submitted"),
      });
    } else {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.review.submitFailed"),
        message: result.error ?? t("topicDetail.review.submitFailedMessage"),
      });
    }

    setActionBusy(false);
  }

  async function handlePreviewGql() {
    if (!topicId || !editorState) return;
    setPreviewBusy(true);
    setPreviewDialogOpen(true);
    setPreviewGql("");
    setPreviewError(null);

    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const result = await previewTopicRule(topicId, {
      rule: { root: normalizedRoot },
    });

    if (!result.data) {
      setPreviewError(result.error ?? t("topicDetail.preview.failed"));
      setPreviewBusy(false);
      return;
    }

    const gql =
      result.data &&
      typeof result.data === "object" &&
      "gql" in (result.data as Record<string, unknown>)
        ? (result.data as { gql?: unknown }).gql
        : null;

    if (typeof gql === "string" && gql.trim()) {
      setPreviewGql(gql);
    } else {
      setPreviewError(t("topicDetail.preview.empty"));
    }

    setPreviewBusy(false);
  }

  async function handleCopyPreviewGql() {
    if (!previewGql.trim()) return;
    try {
      await navigator.clipboard.writeText(previewGql);
      setPreviewDialogOpen(false);
      setActionFeedback({
        type: "success",
        title: t("ruleEditor.previewGql.copySuccess"),
      });
    } catch {
      setActionFeedback({
        type: "error",
        title: t("ruleEditor.previewGql.copyFailed"),
      });
    }
  }

  async function handlePublish() {
    if (!topicId || topicStatus === "IN_REVIEW") return;
    setActionBusy(true);
    setActionFeedback(null);

    const reviewsResult = await fetchTopicReviews(topicId);
    if (!reviewsResult.data || reviewsResult.data.length === 0) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.publish.failed"),
        message: t("topicDetail.publish.noReview"),
      });
      setActionBusy(false);
      return;
    }
    const latest = [...reviewsResult.data].sort((a, b) => b.revision - a.revision)[0];
    let expectedHash: string | null = null;
    try {
      const packet = await fetchReviewPacketBusiness(String(latest.reviewId));
      expectedHash = packet?.contentHash ?? null;
    } catch {
      expectedHash = null;
    }
    if (!expectedHash) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.publish.failed"),
        message: t("topicDetail.publish.noHash"),
      });
      setActionBusy(false);
      return;
    }

    const result = await publishTopic(topicId, {
      publisher: "systemUser",
      expectedHash,
    });
    if (result.data) {
      setTopicStatus("PUBLISHED");
      setActionFeedback({
        type: "success",
        title: t("topicDetail.publish.success"),
      });
    } else {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.publish.failed"),
        message: result.error ?? t("topicDetail.publish.failedMessage"),
      });
    }

    setActionBusy(false);
  }

  useEffect(() => {
    const fromReview = searchParams.get("fromReview");
    if (!fromReview) {
      setReviewReason(null);
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
    fetch(
      `${base}/audit?entityType=REVIEW&entityId=${encodeURIComponent(fromReview)}&raw=true`,
      { cache: "no-store" }
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const events = Array.isArray(data) ? data : data?.data;
        if (!Array.isArray(events)) return;
        const rejected = [...events]
          .reverse()
          .find((event) => event.action === "REJECT_REVIEW");
        setReviewReason(rejected?.reason ?? null);
      })
      .catch(() => setReviewReason(null));
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function loadTopic() {
      if (!topicId) return;
      setLoading(true);
      setError(null);
      setActionFeedback(null);
      const result = await fetchTopicById(topicId);
      if (!active) return;
      if (result.data) {
        setTopicName(result.data.name);
        setTopicStatus(result.data.status);
        const templateId = result.data.template_id;
        const templateVersion = result.data.template_version;
        if (templateId == null) {
          setTemplateLabel(undefined);
        } else {
          const base = `Template #${String(templateId)}`;
          setTemplateLabel(
            templateVersion == null
              ? base
              : `${base} v${String(templateVersion)}`
          );
        }
      } else {
        setError(result.error ?? t("topicDetail.loadFailed"));
      }

      const draftResult = await fetchTopicDraft(topicId);
        if (draftResult.data) {
          if (!hasDraftPayload(draftResult.data)) {
            setActionFeedback({
              type: "error",
              title: t("topicDetail.draft.loadFailed"),
              message: "ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚Â°ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â¨Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚Â¿ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â¥ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂºÃƒâ€¦Ã‚Â¾ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¾ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚Â¼ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â¸ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¼Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚Â¯Ãƒâ€šÃ‚Â·ÃƒÆ’Ã‚Â¨Ãƒâ€šÃ‚ÂÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â³Ãƒâ€šÃ‚Â»ÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚ÂÃƒâ€¦Ã‚Â½ÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â«Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã‚Â¦Ãƒâ€šÃ‚Â£ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚Â¥ draft API ÃƒÆ’Ã‚Â¥ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒâ€šÃ‚ÂÃƒÆ’Ã‚Â¥Ãƒâ€šÃ‚ÂºÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÆ’Ã‚Â§Ãƒâ€šÃ‚Â»ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œÃƒÆ’Ã‚Â¦Ãƒâ€¦Ã‚Â¾ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾ÃƒÆ’Ã‚Â£ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡",
            });
            setEditorState(null);
          } else {
            setEditorState({
              rule: draftResult.data.rule,
              capability: draftResult.data.capability,
              explain: draftResult.data.explain ?? null,
              dirty: false,
            });
          }
        } else {
          setEditorState(null);
          setActionFeedback({
            type: "error",
            title: t("topicDetail.draft.loadFailed"),
            message:
              draftResult.error ??
              t("topicDetail.draft.loadFailed"),
          });
        }
      setLoading(false);
    }

    loadTopic();

    return () => {
      active = false;
    };
  }, [topicId]);

  return (
    <div className="space-y-6 p-6">
      {error && <FeedbackBanner type="error" title={error} />}
      {actionFeedback && (
        <FeedbackBanner
          type={actionFeedback.type}
          title={actionFeedback.title}
          message={actionFeedback.message}
          onDismiss={() => setActionFeedback(null)}
        />
      )}
      {loading ? (
        <div className="text-sm opacity-60">{t("common.loading")}</div>
      ) : (
        <>
          {searchParams.get("fromReview") && (
            <FromReviewBanner
              reviewId={searchParams.get("fromReview") ?? ""}
              reason={reviewReason}
            />
          )}
          {topicStatus === "IN_REVIEW" && (
            <FeedbackBanner
              type="info"
              title={t("topicDetail.review.lockedTitle")}
              message={t("topicDetail.review.lockedMessage")}
            />
          )}

            {editorState ? (
              <RuleEditor
                rule={editorState.rule}
                capability={editorState.capability}
                topicName={topicName}
                status={topicStatus}
                templateLabel={templateLabel}
                capabilityLabel={editorState.capability.semantic.allowModes.join(" / ")}
                dirty={editorState.dirty}
                explain={editorState.explain}
                actionBusy={actionBusy || previewBusy}
                onBack={() => router.push("/knowledge/topics")}
                onSave={topicStatus === "IN_REVIEW" ? undefined : handleSaveDraft}
                onPreview={handlePreviewGql}
                onSubmit={topicStatus === "IN_REVIEW" ? undefined : handleSubmitReview}
                onPublish={topicStatus === "IN_REVIEW" ? undefined : handlePublish}
                onChange={(next) =>
                  setEditorState((prev) =>
                    prev
                      ? { ...prev, rule: next, dirty: true }
                      : {
                          rule: next,
                          capability: editorState.capability,
                          explain: editorState.explain,
                          dirty: true,
                        }
                  )
                }
                readOnly={topicStatus === "IN_REVIEW"}
              />
            ) : (
              <div className="text-sm text-red-500">
                {t("topicDetail.draft.missingCapability")}
              </div>
            )}
          <div className="flex justify-end">
            <button
              type="button"
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              onClick={handleDeleteDraft}
              disabled={actionBusy || topicStatus === "IN_REVIEW"}
            >
              {t("topicActions.deleteDraft")}
            </button>
          </div>
          {previewDialogOpen ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setPreviewDialogOpen(false)}
            >
              <div
                className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                style={previewDialogDrag.style}
              >
                <div
                  className={`mb-3 flex items-start justify-between gap-4 select-none ${
                    previewDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  {...previewDialogDrag.handleProps}
                >
                  <div>
                    <div className="text-base font-semibold">
                      {t("ruleEditor.previewGql.title")}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {t("ruleEditor.previewGql.hint")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={handleCopyPreviewGql}
                    disabled={previewBusy || Boolean(previewError) || !previewGql.trim()}
                  >
                    {t("ruleEditor.previewGql.copy")}
                  </button>
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                    onClick={() => setPreviewDialogOpen(false)}
                  >
                    {t("common.close")}
                  </button>
                </div>
                {previewBusy ? (
                  <div className="text-sm text-slate-500">
                    {t("common.loading")}
                  </div>
                ) : previewError ? (
                  <div className="text-sm text-red-600">{previewError}</div>
                ) : (
                  <pre className="overflow-x-auto rounded-md border bg-slate-50 p-3 text-xs text-slate-800">
                    <code>{previewGql}</code>
                  </pre>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
