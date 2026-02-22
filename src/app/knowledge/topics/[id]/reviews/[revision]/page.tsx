"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  fetchTopicById,
  fetchTopicReviewDetail,
  fetchTopicReviews,
  submitTopicReviewDecision,
  type TopicReviewDetailResponse,
} from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  GovernanceView,
  HistoryCard,
  LogicView,
  ReviewActionBar,
  ReviewHeader,
  SemanticView,
  ViewSwitcher,
} from "@/components/review/governance";
import type {
  ComplexityMetrics,
  ExplainTreeNode,
  HistoryRecord,
  ReviewDecision,
  RiskFinding,
  TemplateCheckItem,
  ReviewViewMode,
} from "@/components/review/governance";
import { t } from "@/i18n";

function statusLabel(status?: string) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (normalized === "IN_REVIEW") return t("topics.status.inReview");
  if (normalized === "APPROVED") return t("topics.status.published");
  if (normalized === "PUBLISHED") return t("topics.status.published");
  if (normalized === "REJECTED") return t("topics.status.rejected");
  if (normalized === "DRAFT") return t("topics.status.draft");
  return (status ?? "").trim() || "UNKNOWN";
}

function normalizeComplexityLevel(level?: string): ComplexityMetrics["level"] {
  const upper = (level ?? "").toUpperCase();
  if (upper === "HIGH" || level === "高") return "高";
  if (upper === "MEDIUM" || upper === "MID" || level === "中") return "中";
  return "低";
}

function normalizeRiskLevel(level?: string): "低风险" | "中风险" | "高风险" {
  const upper = (level ?? "").toUpperCase();
  if (upper === "HIGH" || level === "高风险") return "高风险";
  if (upper === "MEDIUM" || upper === "MID" || level === "中风险") return "中风险";
  return "低风险";
}

function hasExplainContent(explain: unknown): boolean {
  if (!explain || typeof explain !== "object") return false;
  const value = explain as Record<string, unknown>;
  if (typeof value.summary === "string" && value.summary.trim()) return true;
  if (typeof value.title === "string" && value.title.trim()) return true;
  if (Array.isArray(value.blocks) && value.blocks.length > 0) return true;
  if (Array.isArray(value.lines) && value.lines.length > 0) return true;
  if (value.tree && typeof value.tree === "object") return true;
  return false;
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}

function collectOperators(rule: unknown): string[] {
  const operators = new Set<string>();
  const queue: unknown[] = [rule];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    const record = current as Record<string, unknown>;
    const op = asString(record.operator) ?? asString(record.mode) ?? asString(record.logic);
    if (op) operators.add(op.toUpperCase());
    Object.values(record).forEach((value) => queue.push(value));
  }

  return Array.from(operators);
}

function includesRangeConstraint(rule: unknown): boolean {
  const queue: unknown[] = [rule];
  const visited = new Set<unknown>();
  const keys = ["range", "rangeMode", "location", "scope", "relation", "field"];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    const record = current as Record<string, unknown>;
    for (const key of keys) {
      const raw = record[key];
      if (typeof raw !== "string") continue;
      const value = raw.toUpperCase();
      if (
        value.includes("TITLE") ||
        value.includes("BODY") ||
        value.includes("SENTENCE") ||
        value.includes("PARAGRAPH") ||
        value.includes("LIMITED") ||
        value.includes("CONTENT")
      ) {
        return true;
      }
    }
    Object.values(record).forEach((value) => queue.push(value));
  }

  return false;
}

function computeComplexityFallback(rule: unknown, semanticCount: number): ComplexityMetrics {
  const childKeys = ["children", "conditions", "nodes", "rules", "groups", "items", "childrenList"];
  let logicDepth = 1;
  let conditionCount = 0;
  let orCount = 0;
  let excludeCount = 0;

  function visit(node: unknown, depth: number) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth));
      return;
    }

    const record = node as Record<string, unknown>;
    const operator = (
      asString(record.operator) ??
      asString(record.mode) ??
      asString(record.logic) ??
      ""
    ).toUpperCase();

    if (operator === "OR" || operator === "ANY") orCount += 1;
    if (operator === "EXCLUDE" || operator === "NOT") excludeCount += 1;

    const childArrays = childKeys
      .map((key) => record[key])
      .filter((value): value is unknown[] => Array.isArray(value));

    if (childArrays.length > 0) {
      const nextDepth = depth + 1;
      if (nextDepth > logicDepth) logicDepth = nextDepth;
      childArrays.forEach((array) => array.forEach((item) => visit(item, nextDepth)));
      return;
    }

    const nodeType = asString(record.type)?.toUpperCase() ?? "";
    const isLogicOnly = nodeType === "LOGIC" || nodeType === "GROUP" || operator.length > 0;
    if (!isLogicOnly) conditionCount += 1;
  }

  visit(rule, 1);
  if (conditionCount === 0) conditionCount = semanticCount;

  const hasRangeConstraint = includesRangeConstraint(rule);
  const score = Math.min(100, logicDepth * 12 + conditionCount * 6 + orCount * 10 + excludeCount * 8);
  const level: ComplexityMetrics["level"] = score > 70 ? "高" : score > 35 ? "中" : "低";
  const health: ComplexityMetrics["health"] = score <= 35 ? "优" : score <= 70 ? "良" : "需关注";

  return {
    logicDepth,
    conditionCount,
    orCount,
    excludeCount,
    hasRangeConstraint,
    score,
    level,
    health,
  };
}

function normalizeExplainTree(tree: unknown, path = "root"): ExplainTreeNode | null {
  if (!tree || typeof tree !== "object") return null;
  const raw = tree as Record<string, unknown>;
  const children = Array.isArray(raw.children)
    ? raw.children
        .map((child, index) => normalizeExplainTree(child, `${path}.${index}`))
        .filter((node): node is ExplainTreeNode => node !== null)
    : [];

  return {
    id: asString(raw.id) ?? path,
    type: asString(raw.type),
    operator: asString(raw.operator),
    text: asString(raw.text),
    children,
  };
}

function findFirstGroupNodeIdByOperator(
  node: ExplainTreeNode | null,
  operator: string
): string | null {
  if (!node) return null;
  if ((node.type ?? "").toUpperCase() === "GROUP" && (node.operator ?? "").toUpperCase() === operator.toUpperCase()) {
    return node.id ?? null;
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const found = findFirstGroupNodeIdByOperator(child, operator);
    if (found) return found;
  }
  return null;
}

function summarizeTreeNode(node: ExplainTreeNode | null): string {
  if (!node) return "";
  const type = (node.type ?? "").toUpperCase();
  const children = Array.isArray(node.children) ? node.children : [];

  if (type === "TERM") {
    const raw = node.text ?? "";
    const quoted = raw.match(/[「“](.+?)[」”]/);
    if (quoted?.[1]) return `包含“${quoted[1]}”`;
    return raw.trim() ? `包含“${raw.trim()}”` : "满足条件";
  }

  if (children.length === 0) return "";
  const parts = children.map((child) => summarizeTreeNode(child)).filter(Boolean);
  if (parts.length === 0) return "";

  const operator = (node.operator ?? "").toUpperCase();
  if (operator === "OR" || operator === "ANY") {
    return `（${parts.join(" 或 ")}）`;
  }
  if (operator === "EXCLUDE" || operator === "NOT") {
    return `排除（${parts.join(" 且 ")}）`;
  }
  return parts.join(" 且 ");
}

function buildFallbackRiskFindings(metrics: ComplexityMetrics): RiskFinding[] {
  const findings: RiskFinding[] = [];
  if (metrics.orCount > 0) findings.push({ id: "or", text: "使用 OR 逻辑", scoreImpact: metrics.orCount * 10 });
  if (!metrics.hasRangeConstraint) findings.push({ id: "scope", text: "未设置结构范围（默认整篇匹配）", scoreImpact: 5 });
  if (metrics.excludeCount === 0) findings.push({ id: "exclude", text: "未设置排除条件", scoreImpact: 5 });
  return findings;
}

function summarizeFallbackRisk(metrics: ComplexityMetrics, findings: RiskFinding[]) {
  const findingScore = findings.reduce((sum, item) => sum + item.scoreImpact, 0);
  const score = Math.min(100, 20 + Math.floor(metrics.score * 0.35) + findingScore);
  const level: "低风险" | "中风险" | "高风险" = score > 70 ? "高风险" : score > 40 ? "中风险" : "低风险";
  return { score, level };
}

export default function TopicReviewPage() {
  const params = useParams<{ id: string; revision: string }>();
  const router = useRouter();
  const topicId = params?.id ?? "";
  const revision = Number(params?.revision ?? 0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicName, setTopicName] = useState<string>("主题");
  const [topicCreatedAt, setTopicCreatedAt] = useState<string | null>(null);
  const [templateText, setTemplateText] = useState<string>("-");
  const [submittedBy, setSubmittedBy] = useState<string>("-");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("IN_REVIEW");
  const [reviewDetail, setReviewDetail] = useState<TopicReviewDetailResponse | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [view, setView] = useState<ReviewViewMode>("semantic");
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<ReviewDecision>("");
  const [reviewComment, setReviewComment] = useState("");
  const [expectedHash, setExpectedHash] = useState<string | null>(null);
  const [expectedHashHint, setExpectedHashHint] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!topicId) {
        setLoading(false);
        return;
      }
      if (!Number.isFinite(revision)) {
        setError("Invalid review revision.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setExpectedHash(null);
      setExpectedHashHint(null);
      try {

      const [topicResult, reviewsResult, detailResult] = await Promise.all([
        fetchTopicById(topicId),
        fetchTopicReviews(topicId),
        fetchTopicReviewDetail(topicId, revision),
      ]);

      if (!active) return;

      if (topicResult.data) {
        setTopicName(topicResult.data.name?.trim() || "未命名规则");
        setTopicCreatedAt(
          typeof topicResult.data.createdAt === "string" && topicResult.data.createdAt.trim()
            ? topicResult.data.createdAt
            : typeof topicResult.data.updatedAt === "string" && topicResult.data.updatedAt.trim()
              ? topicResult.data.updatedAt
              : null
        );
        const templateId = topicResult.data.template_id == null ? "-" : String(topicResult.data.template_id);
        const templateVersion = topicResult.data.template_version == null ? "" : ` v${topicResult.data.template_version}`;
        setTemplateText(`${templateId}${templateVersion}`);
      }
      const topicStatusForFallback = asString((topicResult.data as { status?: unknown } | null | undefined)?.status);

      let listHashForRevision: string | null = null;
      let listStatusForRevision: string | null = null;
      let listSubmittedByForRevision: string | null = null;
      let listSubmittedAtForRevision: string | null = null;
      const reviewItems = Array.isArray(reviewsResult.data) ? reviewsResult.data : [];
      if (reviewItems.length > 0) {
        const sorted = [...reviewItems].sort((a, b) => b.revision - a.revision);
        setHistoryRecords(
          sorted.map((item) => ({
            revision: item.revision,
            fromRevision: item.revision > 0 ? item.revision - 1 : 0,
            actor: item.reviewedBy ?? item.submittedBy ?? "-",
            time: item.reviewedAt ?? item.submittedAt ?? null,
            summary: `状态：${statusLabel(item.status)}`,
          }))
        );

        const matched = reviewItems.find((item) => item.revision === revision);
        listHashForRevision = asString(matched?.contentHash);
        listStatusForRevision = asString(matched?.status);
        listSubmittedByForRevision = asString(matched?.submittedBy);
        listSubmittedAtForRevision = asString(matched?.submittedAt);
      } else {
        setHistoryRecords([]);
      }

      if (detailResult.data) {
        const detailHash = asString((detailResult.data as { contentHash?: unknown }).contentHash);
        if (detailHash) {
          setExpectedHash(detailHash);
          setExpectedHashHint("哈希来源：评审详情");
        } else if (listHashForRevision) {
          setExpectedHash(listHashForRevision);
          setExpectedHashHint("哈希来源：评审列表");
        } else {
          setExpectedHash(null);
          setExpectedHashHint("评审详情和评审列表均未返回 contentHash");
        }

        const topicExplain = (topicResult.data as any)?.explain;
        const reviewExplain = detailResult.data.explain;
        const effectiveExplain = hasExplainContent(reviewExplain)
          ? reviewExplain
          : hasExplainContent(topicExplain)
            ? topicExplain
            : reviewExplain;

        setReviewDetail({
          ...detailResult.data,
          explain: effectiveExplain,
        });
        const detailStatus = asString((detailResult.data as { status?: unknown }).status);
        setReviewStatus(detailStatus ?? listStatusForRevision ?? topicStatusForFallback ?? "IN_REVIEW");

        const detailSubmittedBy = asString((detailResult.data as { submittedBy?: unknown }).submittedBy);
        setSubmittedBy(detailSubmittedBy ?? listSubmittedByForRevision ?? "-");

        const detailSubmittedAt = asString((detailResult.data as { submittedAt?: unknown }).submittedAt);
        setSubmittedAt(detailSubmittedAt ?? listSubmittedAtForRevision ?? null);

        if (detailResult.data.template_id != null) {
          const templateId = String(detailResult.data.template_id);
          const templateVersion =
            detailResult.data.template_version == null ? "" : ` v${detailResult.data.template_version}`;
          setTemplateText(`${templateId}${templateVersion}`);
        }
      } else {
        setError(detailResult.error ?? "无法加载评审。");
      }

      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load review.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [topicId, revision]);

  const explain = reviewDetail?.explain as Record<string, unknown> | undefined;
  const logicRoot = useMemo(
    () => normalizeExplainTree(explain?.tree),
    [explain?.tree]
  );

  const rule = reviewDetail?.rule;

  const complexity = useMemo(() => {
    const fallback = computeComplexityFallback(rule, 1);
    const schema = (explain?.complexity ?? null) as
      | { depth?: number; clauseCount?: number; score?: number; level?: string }
      | null;
    if (!schema) return fallback;

    const score = schema.score ?? fallback.score;
    const level = normalizeComplexityLevel(schema.level);
    const health: ComplexityMetrics["health"] = score <= 35 ? "优" : score <= 70 ? "良" : "需关注";

    return {
      logicDepth: schema.depth ?? fallback.logicDepth,
      conditionCount: schema.clauseCount ?? fallback.conditionCount,
      orCount: fallback.orCount,
      excludeCount: fallback.excludeCount,
      hasRangeConstraint: fallback.hasRangeConstraint,
      score,
      level,
      health,
    };
  }, [rule, explain]);

  const riskSummary = useMemo(() => {
    const schemaRisk = (explain?.risk ?? null) as
      | {
          score?: number;
          level?: string;
          signals?: Array<{ code?: string; message?: string; weight?: number }>;
        }
      | null;

    if (schemaRisk) {
      const findings: RiskFinding[] = (schemaRisk.signals ?? []).map((signal, index) => ({
        id: signal.code ?? `risk-${index}`,
        text: signal.message ?? signal.code ?? "风险信号",
        scoreImpact: typeof signal.weight === "number" ? signal.weight : 0,
        targetNodeId:
          asString((signal as { targetNodeId?: unknown }).targetNodeId) ??
          ((signal.code ?? "").toUpperCase() === "OR_EXPANSION"
            ? findFirstGroupNodeIdByOperator(logicRoot, "OR")
            : (signal.code ?? "").toUpperCase() === "NO_EXCLUDE_CONDITION"
              ? findFirstGroupNodeIdByOperator(logicRoot, "EXCLUDE")
              : (signal.code ?? "").toUpperCase() === "NO_SCOPE_LIMIT"
                ? logicRoot?.id ?? null
                : null),
      }));
      return {
        score: typeof schemaRisk.score === "number" ? schemaRisk.score : 0,
        level: normalizeRiskLevel(schemaRisk.level),
        findings,
      };
    }

    const findings = buildFallbackRiskFindings(complexity).map((item) => ({
      ...item,
      targetNodeId:
        item.id === "or"
          ? findFirstGroupNodeIdByOperator(logicRoot, "OR")
          : item.id === "scope"
            ? logicRoot?.id ?? null
            : item.id === "exclude"
              ? findFirstGroupNodeIdByOperator(logicRoot, "EXCLUDE")
              : null,
    }));
    const fallback = summarizeFallbackRisk(complexity, findings);
    return { ...fallback, findings };
  }, [complexity, explain, logicRoot]);

  const riskMap = useMemo<Record<string, RiskFinding[]>>(() => {
    const map: Record<string, RiskFinding[]> = {};
    for (const item of riskSummary.findings) {
      const nodeId = item.targetNodeId ?? null;
      if (!nodeId) continue;
      if (!map[nodeId]) map[nodeId] = [];
      map[nodeId].push(item);
    }
    return map;
  }, [riskSummary.findings]);

  const templateChecks = useMemo<TemplateCheckItem[]>(() => {
    const operators = collectOperators(rule);
    const allowed = new Set(["AND", "ALL", "OR", "ANY", "EXCLUDE", "NOT", "LOGSUM", "ACCRUE"]);
    const invalid = operators.filter((operator) => !allowed.has(operator));
    return [
      {
        id: "check-ops",
        passed: invalid.length === 0,
        text: invalid.length === 0 ? "未发现违规操作" : `发现未授权操作符：${invalid.join(", ")}`,
      },
      {
        id: "check-allow",
        passed: invalid.length === 0,
        text: invalid.length === 0 ? "操作符在允许范围内" : "存在超出模板能力的操作符",
      },
    ];
  }, [rule]);

  const semanticSummaryText = useMemo(() => {
    const summaryI18n = explain?.summaryI18n as { zh?: string; en?: string } | undefined;
    if (summaryI18n?.zh?.trim()) return summaryI18n.zh.trim();
    if (typeof explain?.summary === "string" && explain.summary.trim()) return explain.summary.trim();
    const treeSummary = summarizeTreeNode(logicRoot);
    if (treeSummary) return `当文档${treeSummary}时，命中当前主题。`;
    return "暂无语义摘要";
  }, [explain, logicRoot]);
  const semanticTitleText = useMemo(() => {
    if (typeof explain?.title === "string" && explain.title.trim()) return explain.title.trim();
    return "";
  }, [explain]);

  const canSubmit =
    reviewDecision !== "" &&
    !!expectedHash &&
    (reviewDecision === "APPROVE" || reviewComment.trim().length > 0);

  const isReadOnly = reviewStatus !== "IN_REVIEW";
  const readOnlyMessage = `当前状态为「${statusLabel(reviewStatus)}」，仅待评审状态可提交审批结果。`;
  const handleRiskSignalClick = (targetNodeId?: string | null) => {
    setView("logic");
    if (targetNodeId) setHighlightedNodeId(targetNodeId);
  };

  return (
    <div className="space-y-6 p-6">
      <ReviewHeader
        topicId={topicId}
        ruleName={topicName}
        createdAt={topicCreatedAt}
        revision={revision}
        status={statusLabel(reviewStatus)}
        templateText={templateText}
        submitter={submittedBy}
        submittedAt={submittedAt}
      />

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
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
          正在加载评审报告...
        </div>
      ) : (
        <>
          <ViewSwitcher view={view} onChange={setView} />

          {view === "semantic" ? (
            <SemanticView title={semanticTitleText} summary={semanticSummaryText} />
          ) : null}

          {view === "logic" ? (
            <LogicView
              tree={logicRoot}
              highlightedNodeId={highlightedNodeId}
              riskMap={riskMap}
            />
          ) : null}

          {view === "governance" ? (
            <GovernanceView
              risk={riskSummary}
              complexity={complexity}
              templateChecks={templateChecks}
              onRiskSignalClick={handleRiskSignalClick}
            />
          ) : null}

          <HistoryCard
            expanded={historyExpanded}
            onToggle={() => setHistoryExpanded((value) => !value)}
            records={historyRecords}
          />

          <ReviewActionBar
            decision={reviewDecision}
            comment={reviewComment}
            onDecisionChange={setReviewDecision}
            onCommentChange={setReviewComment}
            canSubmit={canSubmit}
            submitting={submitting}
            expectedHashReady={Boolean(expectedHash)}
            expectedHashHint={expectedHashHint}
            readOnly={isReadOnly}
            readOnlyMessage={readOnlyMessage}
            onSubmit={async () => {
              if (isReadOnly || !canSubmit || submitting) return;
              setSubmitting(true);
              const result = await submitTopicReviewDecision(topicId, revision, {
                decision: reviewDecision,
                reviewer: "systemUser",
                comment: reviewComment.trim() || undefined,
                expectedHash: expectedHash ?? undefined,
              });

              if (result.data) {
                setActionFeedback({ type: "success", title: "评审已完成" });
                router.push(`/knowledge/topics/${encodeURIComponent(topicId)}`);
              } else {
                setActionFeedback({
                  type: "error",
                  title: "评审提交失败",
                  message: result.error ?? "无法提交评审结果。",
                });
              }
              setSubmitting(false);
            }}
          />
        </>
      )}
    </div>
  );
}
