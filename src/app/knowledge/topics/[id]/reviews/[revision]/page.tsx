"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  fetchTopicById,
  fetchTopicReviews,
  fetchTopicReviewDetail,
  submitTopicReviewDecision,
} from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import { t } from "@/i18n";

type ReviewDecision = "APPROVE" | "REJECT" | "";

function statusLabel(status?: string) {
  if (status === "IN_REVIEW") return t("review.status.inReview");
  if (status === "PUBLISHED") return t("review.status.published");
  if (status === "REJECTED") return t("review.status.rejected");
  return status ?? t("review.status.draft");
}

export default function TopicReviewPage() {
  const params = useParams<{ id: string; revision: string }>();
  const router = useRouter();
  const topicId = params?.id ?? "";
  const revision = Number(params?.revision ?? 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>(String(t("common.topic")));
  const [reviewStatus, setReviewStatus] = useState("IN_REVIEW");
  const [rule, setRule] = useState<unknown | null>(null);
  const [explain, setExplain] = useState<any>(null);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("");
  const [reviewComment, setReviewComment] = useState("");
  const [expectedHash, setExpectedHash] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!topicId || !revision) return;
      setLoading(true);
      setError(null);
      const topicResult = await fetchTopicById(topicId);
      if (topicResult.data) {
        setTopicName(topicResult.data.name);
      }
      const reviewsResult = await fetchTopicReviews(topicId);
      if (reviewsResult.data) {
        const matched = reviewsResult.data.find((item) => item.revision === revision);
        if (matched?.reviewId) {
          try {
            const packet = await fetchReviewPacketBusiness(String(matched.reviewId));
            setExpectedHash(packet?.contentHash ?? null);
          } catch {
            setExpectedHash(null);
          }
        }
      }
      const detailResult = await fetchTopicReviewDetail(topicId, revision);
      if (!active) return;
      if (detailResult.data) {
        setReviewStatus(detailResult.data.status);
        setRule(detailResult.data.rule ?? null);
        setExplain(detailResult.data.explain ?? null);
      } else {
        setError(detailResult.error ?? t("review.error.load"));
      }
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [topicId, revision]);

  const explainBlocks = useMemo(() => {
    if (explain?.blocks && Array.isArray(explain.blocks)) return explain.blocks;
    return [];
  }, [explain]);

  const canSubmit =
    reviewDecision !== "" &&
    !!expectedHash &&
    (reviewDecision === "APPROVE" || reviewComment.trim().length > 0);

  return (
    <div className="space-y-6 p-6">
      <Link
        className="text-sm text-muted-foreground hover:text-foreground"
        href={`/knowledge/topics/${encodeURIComponent(topicId)}`}
      >
        {t("review.back")}
      </Link>

      <div className="rounded-lg border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("review.title")}
            </div>
            <div className="mt-1 text-xl font-semibold">{topicName}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("review.revision", { revision })}
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
            {statusLabel(reviewStatus)}
          </span>
        </div>
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

      {loading ? (
        <div className="text-sm opacity-60">{t("common.loading")}</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="text-sm font-semibold">Rule Content</div>
              <pre className="mt-3 max-h-[420px] overflow-auto rounded-md bg-slate-50 p-3 text-xs">
                {JSON.stringify(rule, null, 2)}
              </pre>
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="text-sm font-semibold">Explain</div>
              {explainBlocks.length === 0 ? (
                <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-slate-500">
                  {t("review.explain.empty")}
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {explainBlocks.map((block: any, index: number) => (
                    <div key={`explain-${index}`} className="rounded-md border p-3">
                      <div className="text-sm font-medium">{block.title ?? `Block ${index + 1}`}</div>
                      {Array.isArray(block.lines) && block.lines.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                          {block.lines.map((line: string, lineIndex: number) => (
                            <li key={`line-${lineIndex}`}>{line}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-2 text-sm text-slate-500">-</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-semibold">{t("review.actions.title")}</div>
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">{t("review.actions.decision")}</div>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="review-decision"
                    checked={reviewDecision === "APPROVE"}
                    onChange={() => setReviewDecision("APPROVE")}
                  />
                  {t("review.actions.approve")}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="review-decision"
                    checked={reviewDecision === "REJECT"}
                    onChange={() => setReviewDecision("REJECT")}
                  />
                  {t("review.actions.reject")}
                </label>
              </div>

              <div className="space-y-2">
                <div className="font-medium">{t("review.actions.comment")}</div>
                <textarea
                  className="min-h-[96px] w-full rounded-md border px-3 py-2 text-sm"
                  placeholder={
                    reviewDecision === "REJECT"
                      ? t("review.actions.commentReject")
                      : t("review.actions.commentApprove")
                  }
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                />
                {!expectedHash && (
                  <div className="text-xs text-amber-600">{t("review.actions.missingHash")}</div>
                )}
              </div>

              <button
                type="button"
                className="h-9 w-full rounded-md bg-black text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canSubmit || submitting}
                onClick={async () => {
                  if (!canSubmit || submitting) return;
                  setSubmitting(true);
                  const result = await submitTopicReviewDecision(topicId, revision, {
                    decision: reviewDecision,
                    reviewer: "systemUser",
                    comment: reviewComment.trim() || undefined,
                    expectedHash: expectedHash ?? undefined,
                  });
                  if (result.data) {
                    setActionFeedback({
                      type: "success",
                      title: t("review.submit.success"),
                    });
                    router.push("/knowledge/topics");
                  } else {
                    setActionFeedback({
                      type: "error",
                      title: t("review.submit.failure"),
                      message: result.error ?? t("review.submit.failureMessage"),
                    });
                  }
                  setSubmitting(false);
                }}
              >
                {submitting ? t("review.submit.loading") : t("review.submit.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
