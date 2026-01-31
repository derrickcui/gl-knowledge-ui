"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import ReviewActionBar from "@/components/review/ReviewActionBar";
import ReviewerChecklist from "@/components/review/ReviewerChecklist";
import { buildChecklistSummary } from "@/components/review/checklistModel";
import ExplainPreviewDiff from "@/components/review/ExplainPreviewDiff";
import AntiPatternPanel from "@/components/review/AntiPatternPanel";
import RuleNodeView from "@/components/rule-builder/RuleNodeView";
import RejectDialog from "@/components/review/RejectDialog";
import {
  approveReview,
  publishReview,
  rejectReview,
} from "@/components/review/reviewApi";
import ProcessingBanner from "@/components/review/ProcessingBanner";
import ReviewErrorBanner from "@/components/review/ReviewErrorBanner";
import { ReviewActionError } from "@/components/review/reviewErrorTypes";
import AuditTimeline from "@/components/review/AuditTimeline";
import { AuditEvent } from "@/components/review/auditTypes";

async function getReviewPacket(reviewId: string): Promise<any> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/reviews/${reviewId}/packet`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to load review packet");
  const payload = await res.json().catch(() => ({}));
  if (payload?.success === false) {
    throw new Error(payload?.error?.message ?? "Failed to load review packet");
  }
  return payload?.data ?? payload;
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [packet, setPacket] = useState<any>(null);
  const [activePath, setActivePath] = useState<number[]>([]);
  const [hoverPath, setHoverPath] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionError, setActionError] =
    useState<ReviewActionError | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [reviewHash, setReviewHash] = useState<string | undefined>(
    undefined
  );

  async function reload() {
    const data = await getReviewPacket(id);
    setPacket(data);
    setReviewHash(data?.contentHash);
  }

  useEffect(() => {
    let active = true;
    setError(null);
    reload()
      .catch((err) => {
        if (active) setError(err?.message ?? "Failed to load review.");
      });
    fetch(
      `${process.env.NEXT_PUBLIC_API_BASE}/audit?entityType=REVIEW&entityId=${encodeURIComponent(
        id
      )}&raw=true`,
      { cache: "no-store" }
    )
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const events = Array.isArray(data) ? data : data?.data;
        if (active && Array.isArray(events)) setAuditEvents(events);
      })
      .catch(() => {
        if (active) setAuditEvents([]);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (!packet) {
    return <div className="text-sm text-slate-500">加载评审中…</div>;
  }

  const normalizedAnti = normalizeAntiPatterns(packet.antiPatterns);
  const explainDiffForChecklist = normalizeExplainDiffForChecklist(packet);
  const explainDiffForUi = normalizeExplainDiffForUi(packet);

  const firstErrorPath =
    normalizedAnti.findings.find(
      (finding: any) => finding.severity === "ERROR" && finding.path
    )?.path ?? null;

  const beforeExplain = normalizeExplainPayload(
    packet.explain?.before ??
      packet.explainBefore ??
      packet.beforeExplain ??
      packet.explain_before
  );
  const afterExplain = normalizeExplainPayload(
    packet.explain?.after ??
      packet.explainAfter ??
      packet.afterExplain ??
      packet.explain_after ??
      packet.explain
  );
  const ruleTree =
    packet.afterAst ?? packet.draftRule ?? packet.baseRule ?? packet.rule;
  const checklist = buildChecklistSummary(
    explainDiffForChecklist,
    normalizedAnti,
    ruleTree
  );

  return (
    <div className="space-y-4 p-6">
      <RejectDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSubmit={async (reason) => {
          try {
            setIsProcessing(true);
            setActionError(null);
            await rejectReview(
              packet.reviewId,
              reason,
              reviewHash
            );
            setRejectOpen(false);
            router.push(`/knowledge/topics?fromReview=${packet.reviewId}`);
          } catch (err: any) {
            setActionError({
              status: err?.status ?? 500,
              code: err?.code ?? "UNKNOWN",
              message: err?.message,
              details: err?.details,
            });
          } finally {
            setIsProcessing(false);
          }
        }}
      />

      {isProcessing && (
        <ProcessingBanner text="正在提交评审操作，请稍候…" />
      )}
      {actionError && (
        <ReviewErrorBanner
          error={actionError}
          onClose={() => setActionError(null)}
          onFix={(path) => {
            const focus = path?.join(",");
            router.push(
              focus
                ? `/knowledge/topics/${packet.topicId}?focus=${encodeURIComponent(
                    focus
                  )}&fromReview=${encodeURIComponent(packet.reviewId)}`
                : `/knowledge/topics/${packet.topicId}?fromReview=${encodeURIComponent(
                    packet.reviewId
                  )}`
            );
          }}
        />
      )}

      <ReviewActionBar
        topicId={packet.topicId}
        reviewId={packet.reviewId}
        anti={packet.antiPatterns}
        defaultFixPath={firstErrorPath}
        approving={isProcessing}
        onApproveClick={() => {
          setIsProcessing(true);
          setActionError(null);
          approveReview(packet.reviewId, reviewHash)
            .then(() => publishReview(packet.reviewId, reviewHash))
            .then(() =>
              router.push(`/knowledge/topics?fromReview=${packet.reviewId}`)
            )
            .catch((err: any) => {
              setActionError({
                status: err?.status ?? 500,
                code: err?.code ?? "UNKNOWN",
                message: err?.message,
                details: err?.details,
              });
            })
            .finally(() => setIsProcessing(false));
        }}
        onRejectClick={() => {
          setRejectOpen(true);
        }}
      />

      <ReviewerChecklist summary={checklist} />
      <AuditTimeline events={auditEvents} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded border bg-white p-3">
          <div className="mb-2 text-sm font-semibold">规则结构</div>
          <RuleNodeView
            node={ruleTree}
            path={[]}
            activePath={activePath}
            hoverPath={hoverPath}
            onSelect={setActivePath}
          />
        </div>

        <div className="space-y-4">
          <ExplainPreviewDiff
            before={beforeExplain}
            after={afterExplain ?? { blocks: [] }}
            diff={explainDiffForUi}
            onHoverEvidence={setHoverPath}
            onClickEvidence={(path) => {
              setActivePath(path);
              setHoverPath(null);
            }}
          />

          <AntiPatternPanel
            report={normalizedAnti}
            onHoverPath={setHoverPath}
            onClickPath={(path) => {
              setActivePath(path);
              setHoverPath(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function normalizeExplainPayload(raw: any) {
  if (!raw || !Array.isArray(raw.blocks)) return undefined;
  const blocks = raw.blocks.flatMap((block: any) =>
    normalizeExplainBlocks(block)
  );
  return {
    title: raw.title,
    blocks,
  };
}

function normalizeExplainBlocks(block: any) {
  if (!block) return [];
  if (Array.isArray(block.lines) || typeof block.title === "string") {
    return [
      {
        level: block.level ?? "INFO",
        title: block.title ?? block.text ?? "",
        lines: Array.isArray(block.lines) ? block.lines : [],
        evidence: block.evidence,
      },
    ];
  }
  const current = {
    level: block.level ?? "INFO",
    title: block.text ?? "",
    lines: [],
    evidence: block.evidence,
  };
  const children = Array.isArray(block.children)
    ? block.children.flatMap(normalizeExplainBlocks)
    : [];
  return [current, ...children];
}

function normalizeExplainDiffForUi(packet: any) {
  const raw =
    packet.diff?.explain ??
    packet.explainDiff ??
    packet.diffExplain ??
    [];
  if (!Array.isArray(raw)) return undefined;
  const mapped = raw
    .map((item: any, index: number) => {
      const blockIndex =
        typeof item.blockIndex === "number" ? item.blockIndex : null;
      if (blockIndex === null) return null;
      const kind = mapDiffKind(item.kind);
      if (!kind) return null;
      return { kind, blockIndex: blockIndex ?? index };
    })
    .filter(Boolean);
  return mapped.length ? mapped : undefined;
}

function normalizeExplainDiffForChecklist(packet: any) {
  const raw =
    packet.diff?.explain ??
    packet.explainDiff ??
    packet.diffExplain ??
    packet.diff?.items ??
    [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any, index: number) => {
      const kind = mapDiffKind(item.kind);
      if (!kind) return null;
      return { kind, blockIndex: item.blockIndex ?? index };
    })
    .filter(Boolean);
}

function mapDiffKind(raw: any) {
  if (!raw) return null;
  if (raw === "ADD" || raw === "REMOVE" || raw === "MODIFY") return raw;
  if (raw === "ADDED") return "ADD";
  if (raw === "REMOVED") return "REMOVE";
  if (raw === "MODIFIED") return "MODIFY";
  return null;
}

function normalizeAntiPatterns(anti: any) {
  if (!anti) return { score: 0, findings: [] };
  const findings = Array.isArray(anti.findings) ? anti.findings : [];
  return {
    ...anti,
    findings: findings.map((finding: any) => ({
      ...finding,
      path: normalizePath(
        finding.path ??
          finding.pathArray ??
          finding.pathIndexes ??
          finding.pathIndex ??
          finding.pathSegments
      ),
      suggestion:
        finding.suggestion ??
        finding.meta?.suggestion ??
        finding.meta?.recommendation ??
        finding.meta?.advice,
    })),
  };
}

function normalizePath(raw: any): number[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw) && raw.every((n) => Number.isFinite(n))) {
    return raw as number[];
  }
  if (typeof raw === "string") {
    const parts = raw
      .split(/[.,/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part));
    if (parts.length && parts.every((num) => Number.isFinite(num))) {
      return parts as number[];
    }
  }
  return undefined;
}
