"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { fetchTopicById } from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { RuleNode } from "@/components/rule-builder/astTypes";
import { applyOperator } from "@/components/rule-builder/applyOperator";
import { getNodeByPath } from "@/components/rule-builder/astEditor";
import { isValidPath } from "@/components/rule-builder/pathUtils";
import { parseFocusPath } from "@/components/rule-builder/focusQuery";
import FromReviewBanner from "@/components/review/FromReviewBanner";
import { TopicHeader } from "./topic-header";
import OperatorPalette from "@/components/rule-palette/operatorPalette";
import { RuleBuilder } from "./rule-builder";
import { ExplainPreview } from "./explain-preview";
import { TopicActions } from "./topic-actions";

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const topicId = params?.id ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicName, setTopicName] = useState("Topic");
  const [topicStatus, setTopicStatus] = useState("DRAFT");
  const [topicDescription, setTopicDescription] =
    useState<string>("");
  const [rule, setRule] = useState<RuleNode>({
    type: "GROUP",
    params: { operator: "ALL" },
    children: [],
  });
  const [activePath, setActivePath] = useState<number[]>([]);
  const [hoverPath, setHoverPath] = useState<number[] | null>(null);
  const [reviewReason, setReviewReason] = useState<string | null>(null);

  useEffect(() => {
    const focus = parseFocusPath(searchParams.get("focus"));
    if (focus) {
      setActivePath(focus);
    }
  }, [searchParams]);

  useEffect(() => {
    const key = activePath.join("-") || "root";
    const el = document.getElementById(`rule-node-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activePath]);

  useEffect(() => {
    const fromReview = searchParams.get("fromReview");
    if (!fromReview) {
      setReviewReason(null);
      return;
    }
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "";
    fetch(
      `${base}/audit?entityType=REVIEW&entityId=${encodeURIComponent(
        fromReview
      )}&raw=true`,
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
      const result = await fetchTopicById(topicId);
      if (!active) return;
      if (result.data) {
        setTopicName(result.data.name);
        setTopicStatus(result.data.status);
        setTopicDescription(
          result.data.description ??
            "还没有定义规则。请在下方开始编写规则。"
        );
      } else {
        setError(result.error ?? "Unable to load topic.");
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
      {loading ? (
        <div className="text-sm opacity-60">Loading...</div>
      ) : (
        <>
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            href="/knowledge/topics"
          >
            ← Back to Topics
          </Link>
          {searchParams.get("fromReview") && (
            <FromReviewBanner
              reviewId={searchParams.get("fromReview") ?? ""}
              reason={reviewReason}
            />
          )}
          <TopicHeader
            name={topicName}
            status={topicStatus}
            description={topicDescription}
          />
          {topicStatus === "IN_REVIEW" && (
            <FeedbackBanner
              type="info"
              title="规则正在评审中，当前不可修改"
              message="评审完成后可继续编辑或发布。"
            />
          )}

          <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]">
            <OperatorPalette
              activeNode={
                isValidPath(rule, activePath)
                  ? getNodeByPath(rule, activePath)
                  : rule
              }
              disabled={topicStatus === "IN_REVIEW"}
              onSelect={(item) => {
                if (topicStatus === "IN_REVIEW") return;
                setRule((prev) =>
                  applyOperator(prev, activePath, item.id)
                );
              }}
            />
            <RuleBuilder
              rule={rule}
              activePath={activePath}
              hoverPath={hoverPath}
              onSelect={setActivePath}
              readOnly={topicStatus === "IN_REVIEW"}
            />
            <ExplainPreview
              onHoverEvidence={(path) => {
                if (!path) {
                  setHoverPath(null);
                  return;
                }
                setHoverPath(isValidPath(rule, path) ? path : null);
              }}
              onClickEvidence={(path) => {
                if (!isValidPath(rule, path)) return;
                setActivePath(path);
                setHoverPath(null);
              }}
              emptyMessage={
                rule.children && rule.children.length === 0
                  ? "当前规则尚未定义，添加一个条件开始吧"
                  : undefined
              }
            />
          </div>

          <TopicActions
            status={topicStatus}
            onSaveDraft={() => {}}
            onSubmitReview={() => {}}
            onPublish={() => {}}
          />
        </>
      )}
    </div>
  );
}
