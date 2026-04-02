"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  fetchTopicById,
  fetchTopics,
  fetchTopicDraft,
  publishTopic,
  saveTopicDraft,
  deleteTopicDraft,
  submitTopicReview,
  fetchTopicReviews,
  type ExplainPreviewViewModel,
} from "@/lib/topic-api";
import {
  fetchPreviewDocumentDetail,
  type PreviewDocumentDetailResponse,
  type RulePreviewResponse,
} from "@/lib/rule-preview-api";
import { fetchActiveRuntimes, type RuntimeActiveItem } from "@/lib/api/runtime";
import type { RuntimeExecuteOptions, RuntimeExecuteResponse } from "@/lib/api/ruleRuntime";
import { useRuntimeStore } from "@/store/runtimeStore";
import { useRuleExecutionStore } from "@/store/ruleExecutionStore";
import { useRuntimeExecution } from "@/hooks/useRuntimeExecution";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import FromReviewBanner from "@/components/review/FromReviewBanner";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import { TopicHeaderTabs } from "@/components/topics/TopicHeaderTabs";
import { RuleEditor } from "./rule-editor";
import { TopicDeployTab } from "./deploy/TopicDeployTab";
import { TopicRuntimeStatusBar } from "./deploy/TopicRuntimeStatusBar";
import type {
  UiRuleViewModel,
  UiCapabilityViewModel,
  UiExpressionNode,
} from "./rule-editor/types";
import { t } from "@/i18n";
import { hydrateRootForEditor, normalizeRootForSave } from "./rule-editor/save-normalize";
import { validateTree } from "./rule-editor/validation";
import { compileToGql } from "./rule-editor/gql-compiler";
import { normalizeExpressionTree } from "./rule-editor/expression-normalizer";
import { formatExpressionTree } from "./rule-editor/format-expression-tree";
import type { RuleAbTestResult } from "./rule-editor/ab-test";
import type { ExplainViewModel } from "./rule-editor/ExplainPanel";
import { readDefaultRuntimeSceneSelection } from "@/lib/runtime-default-scene";
import {
  analyzeRule,
  compareRuntimeRules,
  diffRuleVersions,
  evaluateRuntimeRuleRisk,
  executeRuntimeRuleAnalysis,
  getRuleVersion,
  listRuleVersions,
  suggestRuntimeRule,
  type RuleAnalyzeResponse,
  type RuleRuntimeExecuteAnalysisResponse,
  type RuleRuntimeRiskResponse,
  type RuleRuntimeSuggestResponse,
  type RuleDiffResponse,
} from "@/lib/api/ruleGovernance";
import type { RuleVersionEntry } from "./rule-editor/RuleVersionTimelinePanel";
import type { NodeDiffDetail } from "./rule-editor/diff";
import type {
  ComplexityMetrics,
  HitDistribution,
  OptimizationSuggestion,
  PerformanceMetrics,
  RiskAssessment,
} from "./rule-editor/rule-intelligence";

export const dynamic = "force-dynamic";

const DEFAULT_VERSION_WINDOW = 20;
const MAX_VERSION_WINDOW = 100;

function normalizeStatus(status: string) {
  return String(status ?? "").trim().toUpperCase();
}

export default function TopicDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <TopicDetailPageClient />
    </Suspense>
  );
}

function getStatusLabel(status: string) {
  const normalized = normalizeStatus(status);
  if (normalized === "DRAFT") return t("topics.status.draft");
  if (normalized === "IN_REVIEW") return t("topics.status.inReview");
  if (normalized === "APPROVED") return t("topics.status.published");
  if (normalized === "REJECTED") return t("topics.status.rejected");
  if (normalized === "PUBLISHED") return t("topics.status.published");
  return status || "-";
}

function isLockedActionStatus(status: string): boolean {
  return status === "IN_REVIEW" || status === "PUBLISHED" || status === "APPROVED";
}

function getVersionWindowSize(): number {
  const raw = process.env.NEXT_PUBLIC_RULE_VERSION_WINDOW;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_VERSION_WINDOW;
  const normalized = Math.floor(parsed);
  if (normalized < 1) return 1;
  if (normalized > MAX_VERSION_WINDOW) return MAX_VERSION_WINDOW;
  return normalized;
}

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

function mapExecutionResultToPreview(result: RuntimeExecuteResponse): RulePreviewResponse {
  if (result.mode === "FULL") {
    return {
      mode: "FULL_RULE",
      total: result.total,
      nodeTotal: result.total,
      fullRuleTotal: result.total,
      delta: 0,
      items: result.items.map((item) => ({
        id: item.id,
        title: item.title,
        matchedReasons: item.matchedReasons.map((reason) => ({
          field: reason.field,
          label: reason.label,
          keyword: reason.matchedTerms?.[0] ?? reason.displayText ?? "",
        })),
        highlightFragments: item.highlightFragments,
      })),
    };
  }

  if (result.mode === "NODE") {
    return {
      mode: "NODE",
      nodeId: result.nodeId,
      total: result.nodeTotal,
      nodeTotal: result.nodeTotal,
      fullRuleTotal: result.fullTotal,
      delta: result.delta,
      items: result.items.map((item) => ({
        id: item.id,
        title: item.title,
        matchedReasons: item.matchedReasons.map((reason) => ({
          field: reason.field,
          label: reason.label,
          keyword: reason.matchedTerms?.[0] ?? reason.displayText ?? "",
        })),
        highlightFragments: item.highlightFragments,
      })),
    };
  }

  return {
    mode: "FULL_RULE",
    total: result.fullTotal,
    nodeTotal: result.fullTotal,
    fullRuleTotal: result.fullTotal,
    delta: 0,
    impactRanking: result.analysis.map((item) => ({
      nodeId: item.nodeId,
      label: item.label,
      totalWithoutNode: item.removedTotal,
      contribution: item.contribution,
      contributionRate: result.fullTotal > 0 ? item.contribution / result.fullTotal : 0,
    })),
    items: [],
  };
}

function toRuntimeLogicPayload(node: Extract<UiExpressionNode, { type: "LOGIC" }>) {
  if (node.operator === "ALL") {
    return { operator: "AND" as const, threshold: undefined, minMatch: undefined };
  }
  if (node.operator === "ANY") {
    return { operator: "OR" as const, threshold: undefined, minMatch: undefined };
  }
  if (node.operator === "AT_LEAST") {
    const minMatch = node.threshold;
    return { operator: "LOGSUM" as const, threshold: minMatch, minMatch };
  }
  if (node.operator === "LOGSUM") {
    return { operator: "LOGSUM" as const, threshold: node.threshold, minMatch: node.threshold };
  }
  return { operator: node.operator, threshold: node.threshold, minMatch: undefined };
}

function pickBoostWeight(node: UiExpressionNode): number | null {
  const value = (node as { weight?: unknown }).weight;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  if (value === 1) return null;
  return value;
}

function toRuntimeNode(node: UiExpressionNode): Record<string, unknown> {
  const base: Record<string, unknown> = (() => {
    switch (node.type) {
    case "LOGIC": {
      const logic = toRuntimeLogicPayload(node);
      return {
        type: "LOGIC",
        nodeId: node.id,
        operator: logic.operator,
        threshold: logic.threshold,
        minMatch: logic.minMatch,
        importance: node.importance,
        importanceWeight: node.importanceWeight,
        children: node.children.map((child) => toRuntimeNode(child)),
      };
    }
    case "PROXIMITY":
      return {
        type: "PROXIMITY",
        nodeId: node.id,
        relation: node.relation,
        ordered: node.ordered,
        distance: node.distance,
        children: node.children.map((child) => toRuntimeNode(child)),
      };
    case "POSITION_RELATION":
      return {
        type: "POSITION_RELATION",
        nodeId: node.id,
        mode: node.mode,
        relation: node.relation,
        distance: node.distance,
        ordered: node.ordered,
        strict: node.strict,
        children: node.children.map((child) => toRuntimeNode(child)),
      };
    case "FIELD":
      return {
        type: "FIELD",
        nodeId: node.id,
        field: node.field,
        child: node.child ? toRuntimeNode(node.child) : null,
      };
    case "STRUCTURE":
      return {
        type: "STRUCTURE",
        nodeId: node.id,
        scope: node.scope,
        child: node.child ? toRuntimeNode(node.child) : null,
      };
    case "TERM_SET":
      return {
        type: "TERM_SET",
        nodeId: node.id,
        terms: node.terms,
        matchMode: node.matchMode,
        importance: node.importance,
        importanceWeight: node.importanceWeight,
      };
    case "NOT":
      return {
        type: "NOT",
        nodeId: node.id,
        child: node.child ? toRuntimeNode(node.child) : null,
      };
    case "SCORE":
      return {
        type: "BOOST",
        nodeId: node.id,
        weight: node.weight,
        child: node.child ? toRuntimeNode(node.child) : null,
      };
    case "TOPIC_REF":
      return {
        type: "TOPIC_REF",
        nodeId: node.id,
        topicId: node.topicId,
      };
    default: {
      const _never: never = node;
      return _never;
    }
    }
  })();

  if (node.type === "SCORE") return base;

  const boostWeight = pickBoostWeight(node);
  if (boostWeight == null) return base;
  return {
    type: "BOOST",
    nodeId: node.id,
    weight: boostWeight,
    child: base,
  };
}

function complexityLevelByScore(score: number): ComplexityMetrics["level"] {
  if (score > 100) return "RISKY";
  if (score > 50) return "COMPLEX";
  if (score > 20) return "MEDIUM";
  return "SIMPLE";
}

function mapAnalyzeToComplexity(metrics: RuleAnalyzeResponse): ComplexityMetrics {
  return {
    score: metrics.complexityScore,
    level: complexityLevelByScore(metrics.complexityScore),
    nodeCount: metrics.clauseCount + metrics.logicCount,
    depth: metrics.depth,
    proximityCount: metrics.proximityCount,
    logsumCount: metrics.operatorCount,
  };
}

function mapAnalysisToDistribution(result: RuleRuntimeExecuteAnalysisResponse): HitDistribution {
  function aggregateTop(
    items: Array<{ key: string; count: number }>
  ): Array<{ key: string; count: number }> {
    const counter = new Map<string, number>();
    items.forEach((item) => {
      const current = counter.get(item.key) ?? 0;
      counter.set(item.key, current + item.count);
    });
    return Array.from(counter.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  return {
    byField: aggregateTop(
      result.nodeStats.map((item) => ({
        key: item.nodeType || "UNKNOWN",
        count: item.hitCount,
      }))
    ),
    byKeyword: aggregateTop(
      result.termStats.map((item) => ({
        key: item.termId || "UNKNOWN",
        count: item.hitCount,
      }))
    ),
  };
}

function mapRiskToAssessment(risk: RuleRuntimeRiskResponse): RiskAssessment {
  return {
    score: risk.riskScore,
    level: risk.riskLevel === "HIGH" ? "HIGH" : risk.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW",
    reasons: risk.riskFactors,
  };
}

function mapRiskToPerformance(risk: RuleRuntimeRiskResponse): PerformanceMetrics {
  return {
    tookMs: risk.executeTime,
    clauseCount: risk.clauseCount,
    nestedDepth: risk.maxDepth,
    riskScore: risk.riskScore,
    riskLevel: risk.riskLevel,
  };
}

function mapSuggestToOptimization(
  suggest: RuleRuntimeSuggestResponse
): OptimizationSuggestion[] {
  return suggest.suggestions.map((item) => {
    const upper = item.type.toUpperCase();
    let type: OptimizationSuggestion["type"] = "BACKEND";
    if (upper.includes("PROXIMITY")) type = "USE_PROXIMITY";
    else if (upper.includes("LOGSUM_TO_AND")) type = "LOGSUM_TO_AND";
    else if (upper.includes("FLATTEN")) type = "FLATTEN_LOGIC";
    else if (upper.includes("REMOVE_LOW_IMPACT")) type = "REMOVE_LOW_IMPACT";

    const priority: OptimizationSuggestion["priority"] =
      item.score >= 0.8 ? "HIGH" : item.score >= 0.5 ? "MEDIUM" : "LOW";

    return {
      type,
      nodeId: item.nodeId ?? item.termId ?? "unknown",
      message: item.message,
      priority,
      payload: { backendType: item.type, termId: item.termId },
    };
  });
}

function mapRuleDiff(diff: RuleDiffResponse): NodeDiffDetail {
  const statusById: Record<string, "added" | "changed"> = {};
  diff.addedNodes.forEach((node) => {
    statusById[node] = "added";
  });
  diff.modifiedNodes.forEach((node) => {
    statusById[node.path] = "changed";
  });
  return {
    added: diff.addedNodes.length,
    removed: diff.removedNodes.length,
    changed: diff.modifiedNodes.length,
    statusById,
    removedNodes: diff.removedNodes.map((node) => ({ id: node, signature: "" })),
  };
}

function mapStatusToLatestAction(status: string): RuleVersionEntry["action"] {
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "IN_REVIEW") return "SUBMITTED";
  return "SAVED";
}

function TopicDetailPageClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const topicId = params?.id ?? "";

  const [activeTab, setActiveTab] = useState<"RULE" | "REVIEW" | "PUBLISH" | "DEPLOY">("RULE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [saveDraftBusy, setSaveDraftBusy] = useState(false);
  const [deleteDraftBusy, setDeleteDraftBusy] = useState(false);
  const [submitReviewBusy, setSubmitReviewBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [abTestBusy, setAbTestBusy] = useState(false);
  const [topicName, setTopicName] = useState<string>(t("common.topic"));
  const [topicCreatedAt, setTopicCreatedAt] = useState<string | null>(null);
  const [topicStatus, setTopicStatus] = useState("DRAFT");
  const [templateLabel, setTemplateLabel] = useState<string | undefined>(undefined);
  const [latestRevision, setLatestRevision] = useState<number | null>(null);
  const [reviewReason, setReviewReason] = useState<string | null>(null);
  const executionLoading = useRuleExecutionStore((s) => s.loading);
  const executionError = useRuleExecutionStore((s) => s.error);
  const setExecutionError = useRuleExecutionStore((s) => s.setError);
  const activeRuntimeId = useRuntimeStore((s) => s.activeRuntimeId);
  const setActiveRuntime = useRuntimeStore((s) => s.setActiveRuntime);
  const { execute, executeNode } = useRuntimeExecution();
  const [previewResult, setPreviewResult] = useState<RulePreviewResponse | null>(null);
  const [compiledGql, setCompiledGql] = useState<string | null>(null);
  const [compiledGqlSource, setCompiledGqlSource] = useState<"local-compiler" | "server" | null>(null);
  const [fullRuntimeResult, setFullRuntimeResult] = useState<Extract<RuntimeExecuteResponse, { mode: "FULL" }> | null>(null);
  const [impactRuntimeResult, setImpactRuntimeResult] = useState<Extract<RuntimeExecuteResponse, { mode: "IMPACT" }> | null>(null);
  const [nodeRuntimeResults, setNodeRuntimeResults] = useState<
    Record<string, Extract<RuntimeExecuteResponse, { mode: "NODE" }>>
  >({});
  const [previewDocumentBusy, setPreviewDocumentBusy] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<PreviewDocumentDetailResponse | null>(null);
  const [abTestResult, setAbTestResult] = useState<RuleAbTestResult | null>(null);
  const [complexityMetricsOverride, setComplexityMetricsOverride] = useState<ComplexityMetrics | null>(null);
  const [hitDistributionOverride, setHitDistributionOverride] = useState<HitDistribution | null>(null);
  const [performanceMetricsOverride, setPerformanceMetricsOverride] = useState<PerformanceMetrics | null>(null);
  const [riskAssessmentOverride, setRiskAssessmentOverride] = useState<RiskAssessment | null>(null);
  const [optimizationSuggestionsOverride, setOptimizationSuggestionsOverride] = useState<OptimizationSuggestion[] | null>(null);
  const [versionHistoryOverride, setVersionHistoryOverride] = useState<RuleVersionEntry[] | null>(null);
  const [diffOverride, setDiffOverride] = useState<NodeDiffDetail | null>(null);
  const actionsLocked = isLockedActionStatus(topicStatus);
  const [runtimeOptions, setRuntimeOptions] = useState<RuntimeActiveItem[]>([]);
  const [editorState, setEditorState] = useState<{
    rule: UiRuleViewModel;
    capability: UiCapabilityViewModel;
    explain: ExplainPreviewViewModel | null;
    dirty: boolean;
  } | null>(null);
  const submitReviewPendingRef = useRef(false);
  const localCompilerEnabled =
    process.env.NEXT_PUBLIC_RULE_LOCAL_GQL_COMPILER !== "0";

  function compileBeforeExecution(root: UiExpressionNode): boolean {
    if (!localCompilerEnabled) {
      setCompiledGql(null);
      setCompiledGqlSource(null);
      return true;
    }
    try {
      const gql = compileToGql(root);
      setCompiledGql(gql);
      setCompiledGqlSource("local-compiler");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : t("topicDetail.preview.failed");
      setExecutionError(message);
      setCompiledGql(null);
      setCompiledGqlSource(null);
      return false;
    }
  }

  async function refreshGovernance(ruleId: string) {
    try {
      const versions = await listRuleVersions(ruleId);
      const versionWindow = getVersionWindowSize();
      const sorted = versions
        .slice()
        .sort((a, b) => a.version - b.version)
        .slice(-versionWindow);
      if (sorted.length === 0) {
        setVersionHistoryOverride(null);
        return;
      }

      const versionDetails = await Promise.all(
        sorted.map(async (item) => {
          const detail = await getRuleVersion(ruleId, item.version);
          return {
            ...item,
            rule: detail.rule,
          };
        })
      );

      const runtimeIdForRisk = activeRuntimeId ?? runtimeOptions[0]?.id ?? null;
      const timelineEntries = await Promise.all(
        versionDetails.map(async (item, index) => {
          const [analyzeRes, riskRes, prevDiff] = await Promise.all([
            analyzeRule(item.rule).catch(() => null),
            runtimeIdForRisk
              ? evaluateRuntimeRuleRisk({
                  runtimeEnvironmentId: runtimeIdForRisk,
                  rule: item.rule,
                }).catch(() => null)
              : Promise.resolve(null),
            index > 0
              ? diffRuleVersions(ruleId, sorted[index - 1].version, item.version).catch(() => null)
              : Promise.resolve(null),
          ]);

          const action: RuleVersionEntry["action"] =
            index === 0
              ? "LOADED"
              : index === versionDetails.length - 1
                ? mapStatusToLatestAction(topicStatus)
                : "SAVED";

          return {
            id: `persisted-${item.version}`,
            version: `v${item.version}.0`,
            action,
            at: item.createdAt,
            added: prevDiff?.addedNodes.length ?? 0,
            removed: prevDiff?.removedNodes.length ?? 0,
            changed: prevDiff?.modifiedNodes.length ?? 0,
            riskLevel: riskRes?.riskLevel ?? "-",
            complexityScore: analyzeRes?.complexityScore ?? 0,
          } satisfies RuleVersionEntry;
        })
      );

      setVersionHistoryOverride(timelineEntries);

      if (sorted.length >= 2) {
        const from = sorted[sorted.length - 2]?.version;
        const to = sorted[sorted.length - 1]?.version;
        if (from != null && to != null) {
          const latestDiff = await diffRuleVersions(ruleId, from, to);
          setDiffOverride(mapRuleDiff(latestDiff));
        }
      } else {
        setDiffOverride(null);
      }
    } catch {
      // Keep UI fallback behavior when governance APIs are unavailable.
    }
  }

  async function handleSaveDraft() {
    if (!topicId || isLockedActionStatus(topicStatus) || !editorState) return;
    const issues = validateTree(editorState.rule.root, editorState.capability).filter(
      (item) => item.severity === "error"
    );
    if (issues.length > 0) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.draft.saveFailed"),
        message: issues[0].message,
      });
      return;
    }
    setSaveDraftBusy(true);
    setActionBusy(true);
    setActionFeedback({
      type: "info",
      title: t("topicActions.savingDraft"),
    });
    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const normalizedExpression = normalizeExpressionTree(normalizedRoot).root;
    if (!normalizedExpression) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.draft.saveFailed"),
        message: t("ruleEditor.validation.needAtLeastOneCondition"),
      });
      setSaveDraftBusy(false);
      setActionBusy(false);
      return;
    }
    const normalizedOnSave =
      JSON.stringify(editorState.rule.root) !== JSON.stringify(normalizedRoot);
    const normalizedIssues = validateTree(normalizedExpression, editorState.capability).filter(
      (item) => item.severity === "error"
    );
    if (normalizedIssues.length > 0) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.draft.saveFailed"),
        message: normalizedIssues[0].message,
      });
      setSaveDraftBusy(false);
      setActionBusy(false);
      return;
    }

    const result = await saveTopicDraft(topicId, {
      rule: { root: toRuntimeNode(normalizedExpression) },
    });

      if (result.data) {
        if (!hasDraftPayload(result.data)) {
          setActionFeedback({
            type: "error",
            title: t("topicDetail.draft.saveFailed"),
            message: t("topicDetail.draft.missingUiRule"),
          });
        } else {
          const hydratedRoot = hydrateRootForEditor(result.data.rule.root);
          setEditorState({
            rule: { ...result.data.rule, root: hydratedRoot },
            capability: result.data.capability,
            explain: result.data.explain ?? null,
            dirty: false,
          });
          await refreshGovernance(topicId);
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

    setSaveDraftBusy(false);
    setActionBusy(false);
  }

  async function handleDeleteDraft() {
    if (!topicId || isLockedActionStatus(topicStatus)) return;
    setDeleteDraftBusy(true);
    setActionBusy(true);
    setActionFeedback({
      type: "info",
      title: t("topicActions.deletingDraft"),
    });

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
    if (!topicId || isLockedActionStatus(topicStatus) || submitReviewPendingRef.current) return;
    if (editorState) {
      const issues = validateTree(editorState.rule.root, editorState.capability).filter(
        (item) => item.severity === "error"
      );
      if (issues.length > 0) {
        setActionFeedback({
          type: "error",
          title: t("topicDetail.review.submitFailed"),
          message: issues[0].message,
        });
        return;
      }
    }
    submitReviewPendingRef.current = true;
    setSubmitReviewBusy(true);
    setActionBusy(true);
    setActionFeedback({
      type: "info",
      title: t("topicActions.submittingReview"),
    });

    try {
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
    } finally {
      submitReviewPendingRef.current = false;
      setSubmitReviewBusy(false);
      setActionBusy(false);
    }
  }

  async function handleRunWorkspace(options?: { page?: number; size?: number }) {
    if (!editorState) return;
    setExecutionError(null);
    setPreviewDocument(null);
    const resolvedRuntimeId = activeRuntimeId ?? runtimeOptions[0]?.id ?? null;
    if (!resolvedRuntimeId) {
      setExecutionError(t("topicDetail.runtime.notSelected"));
      return;
    }
    if (!activeRuntimeId) {
      setActiveRuntime(resolvedRuntimeId);
    }

    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const normalizedExpression = normalizeExpressionTree(normalizedRoot).root;
    if (!normalizedExpression) {
      setPreviewResult({
        mode: "FULL_RULE",
        nodeId: null,
        total: 0,
        previousTotal: null,
        nodeTotal: 0,
        fullRuleTotal: 0,
        delta: 0,
        impactRanking: [],
        items: [],
      });
      return;
    }
    const normalizedIssues = validateTree(normalizedExpression, editorState.capability).filter(
      (item) => item.severity === "error"
    );
    if (normalizedIssues.length > 0) {
      setExecutionError(normalizedIssues[0].message);
      return;
    }
    if (!compileBeforeExecution(normalizedExpression)) {
      return;
    }

    try {
      const runtimeRulePayload = { root: toRuntimeNode(normalizedExpression), references: [] };
      const fullRes = await execute({
        mode: "FULL",
        rule: runtimeRulePayload,
        runtimeEnvironmentId: resolvedRuntimeId,
        options: { page: options?.page, size: options?.size, withHighlight: true, withItems: true },
      });
      if (fullRes.mode === "FULL") {
        setFullRuntimeResult(fullRes);
        setPreviewResult(mapExecutionResultToPreview(fullRes));
      }

      const impactRes = await execute({
        mode: "IMPACT",
        rule: runtimeRulePayload,
        runtimeEnvironmentId: resolvedRuntimeId,
        options: { withHighlight: false, withItems: false },
      });
      if (impactRes.mode === "IMPACT") {
        setImpactRuntimeResult(impactRes);
      }

      const [analyzeRes, analysisRes, suggestRes, riskRes] = await Promise.all([
        analyzeRule(runtimeRulePayload).catch(() => null),
        executeRuntimeRuleAnalysis({
          runtimeEnvironmentId: resolvedRuntimeId,
          rule: runtimeRulePayload,
        }).catch(() => null),
        suggestRuntimeRule({
          runtimeEnvironmentId: resolvedRuntimeId,
          rule: runtimeRulePayload,
        }).catch(() => null),
        evaluateRuntimeRuleRisk({
          runtimeEnvironmentId: resolvedRuntimeId,
          rule: runtimeRulePayload,
        }).catch(() => null),
      ]);

      if (analyzeRes) {
        setComplexityMetricsOverride(mapAnalyzeToComplexity(analyzeRes));
      }
      if (analysisRes) {
        setHitDistributionOverride(mapAnalysisToDistribution(analysisRes));
      }
      if (suggestRes) {
        setOptimizationSuggestionsOverride(mapSuggestToOptimization(suggestRes));
      }
      if (riskRes) {
        setRiskAssessmentOverride(mapRiskToAssessment(riskRes));
        setPerformanceMetricsOverride(mapRiskToPerformance(riskRes));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("topicDetail.preview.failed");
      setExecutionError(message);
    }
  }

  async function handleRunNode(nodeId: string, options?: RuntimeExecuteOptions) {
    if (!editorState || !nodeId) return;
    setExecutionError(null);
    const resolvedRuntimeId = activeRuntimeId ?? runtimeOptions[0]?.id ?? null;
    if (!resolvedRuntimeId) {
      setExecutionError(t("topicDetail.runtime.notSelected"));
      return;
    }
    if (!activeRuntimeId) {
      setActiveRuntime(resolvedRuntimeId);
    }
    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const normalizedExpression = normalizeExpressionTree(normalizedRoot).root;
    if (!normalizedExpression) return;
    const normalizedIssues = validateTree(normalizedExpression, editorState.capability).filter(
      (item) => item.severity === "error"
    );
    if (normalizedIssues.length > 0) {
      setExecutionError(normalizedIssues[0].message);
      return;
    }
    if (!compileBeforeExecution(normalizedExpression)) {
      return;
    }
    try {
      const nodeRes = await executeNode({
        rule: { root: toRuntimeNode(normalizedExpression), references: [] },
        nodeId: nodeId,
        runtimeEnvironmentId: resolvedRuntimeId,
        options: {
          page: options?.page,
          size: options?.size,
          withHighlight: options?.withHighlight ?? true,
          withItems: options?.withItems ?? true,
        },
      });
      if (nodeRes.mode === "NODE") {
        setNodeRuntimeResults((prev) => ({ ...prev, [nodeId]: nodeRes }));
        setPreviewResult(mapExecutionResultToPreview(nodeRes));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t("topicDetail.preview.failed");
      setExecutionError(message);
    }
  }

  async function handleRunAbTest() {
    if (!editorState) return;
    setAbTestBusy(true);
    setExecutionError(null);
    const resolvedRuntimeId = activeRuntimeId ?? runtimeOptions[0]?.id ?? null;
    if (!resolvedRuntimeId) {
      setExecutionError(t("topicDetail.runtime.notSelected"));
      setAbTestBusy(false);
      return;
    }
    if (!activeRuntimeId) {
      setActiveRuntime(resolvedRuntimeId);
    }

    const normalizedRoot = normalizeRootForSave(editorState.rule.root);
    const normalizedExpression = normalizeExpressionTree(normalizedRoot).root;
    if (!normalizedExpression) return;
    const normalizedIssues = validateTree(normalizedExpression, editorState.capability).filter(
      (item) => item.severity === "error"
    );
    if (normalizedIssues.length > 0) {
      setExecutionError(normalizedIssues[0].message);
      setAbTestBusy(false);
      return;
    }

    const candidateB = formatExpressionTree(normalizedExpression);
    if (!candidateB) return;

    try {
      const runtimeRuleA = { root: toRuntimeNode(normalizedExpression), references: [] };
      const runtimeRuleB = { root: toRuntimeNode(candidateB), references: [] };
      const compare = await compareRuntimeRules({
        runtimeEnvironmentId: resolvedRuntimeId,
        ruleA: runtimeRuleA,
        ruleB: runtimeRuleB,
      });
      const union = compare.overlap + compare.onlyA + compare.onlyB;
      const deltaHit = compare.ruleBHit - compare.ruleAHit;
      const deltaHitRate = compare.ruleAHit > 0 ? deltaHit / compare.ruleAHit : 0;
      const overlapRate = union > 0 ? compare.overlap / union : 1;
      setAbTestResult({
        generatedAt: new Date().toLocaleString(),
        ruleA: { label: t("topicDetail.ab.labelA"), total: compare.ruleAHit, took: compare.took },
        ruleB: { label: t("topicDetail.ab.labelB"), total: compare.ruleBHit, took: compare.took },
        deltaHit,
        deltaHitRate,
        overlapRate,
        winner: compare.ruleBHit > compare.ruleAHit ? "B" : compare.ruleBHit < compare.ruleAHit ? "A" : "TIE",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("topicDetail.preview.failed");
      setExecutionError(message);
    } finally {
      setAbTestBusy(false);
    }
  }

  async function handleSelectPreviewDocument(docId: string) {
    if (!docId) return;
    setPreviewDocumentBusy(true);
    const result = await fetchPreviewDocumentDetail(docId);
    if (!result.data) {
      setExecutionError(result.error ?? t("topicDetail.preview.documentLoadFailed"));
      setPreviewDocumentBusy(false);
      return;
    }
    setPreviewDocument(result.data);
    setPreviewDocumentBusy(false);
  }

  async function handlePublish() {
    if (!topicId || isLockedActionStatus(topicStatus)) return;
    if (editorState) {
      const issues = validateTree(editorState.rule.root, editorState.capability).filter(
        (item) => item.severity === "error"
      );
      if (issues.length > 0) {
        setActionFeedback({
          type: "error",
          title: t("topicDetail.publish.failed"),
          message: issues[0].message,
        });
        return;
      }
    }
    setSubmitReviewBusy(true);
    setActionBusy(true);
    setActionFeedback({
      type: "info",
      title: t("topicActions.submittingReview"),
    });

    const reviewsResult = await fetchTopicReviews(topicId);
    if (!reviewsResult.data || reviewsResult.data.length === 0) {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.publish.failed"),
        message: t("topicDetail.publish.noReview"),
      });
      setPublishBusy(false);
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
      setPublishBusy(false);
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

    setSubmitReviewBusy(false);
    setPublishBusy(false);
    setActionBusy(false);
  }

  useEffect(() => {
    const syncDefaultScene = async () => {
      const selected = readDefaultRuntimeSceneSelection();
      const activeItems = await fetchActiveRuntimes().catch(() => []);
      setRuntimeOptions(activeItems);
      if (selected?.id && activeItems.some((item) => item.id === selected.id)) {
        setActiveRuntime(selected.id);
        return;
      }
      if (activeItems[0]?.id) {
        setActiveRuntime(activeItems[0].id);
      }
    };
    syncDefaultScene();
    const onStorage = () => {
      syncDefaultScene();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setActiveRuntime]);

  useEffect(() => {
    const tab = (searchParams.get("tab") ?? "").toUpperCase();
    if (tab === "RULE" || tab === "REVIEW" || tab === "PUBLISH" || tab === "DEPLOY") {
      setActiveTab(tab);
    }
  }, [searchParams]);

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
      setTopicCreatedAt(null);
      setActionFeedback(null);
      setComplexityMetricsOverride(null);
      setHitDistributionOverride(null);
      setPerformanceMetricsOverride(null);
      setRiskAssessmentOverride(null);
      setOptimizationSuggestionsOverride(null);
      setVersionHistoryOverride(null);
      setDiffOverride(null);
      const [result, topicsResult, reviewsResult] = await Promise.all([
        fetchTopicById(topicId),
        fetchTopics(),
        fetchTopicReviews(topicId),
      ]);
      if (!active) return;
      if (result.data) {
        const listTopic = topicsResult.data?.items.find((item) => item.id === topicId) ?? null;
        const resolvedTopicName =
          (typeof result.data.name === "string" && result.data.name.trim()
            ? result.data.name.trim()
            : typeof listTopic?.name === "string" && listTopic.name.trim()
              ? listTopic.name.trim()
              : t("common.topic"));
        setTopicName(resolvedTopicName);
        setTopicCreatedAt(
          typeof result.data.createdAt === "string" && result.data.createdAt.trim()
            ? result.data.createdAt
            : typeof result.data.updatedAt === "string" && result.data.updatedAt.trim()
              ? result.data.updatedAt
            : null
        );
        const detailStatus =
          typeof result.data.status === "string" && result.data.status.trim()
            ? result.data.status.trim()
            : null;
        const listStatus = listTopic?.status ?? null;
        setTopicStatus(detailStatus ?? listStatus ?? "DRAFT");
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
      const latest = (reviewsResult.data ?? [])
        .slice()
        .sort((a, b) => b.revision - a.revision)[0];
      setLatestRevision(latest?.revision ?? null);

      const draftResult = await fetchTopicDraft(topicId);
        if (draftResult.data) {
          if (!hasDraftPayload(draftResult.data)) {
            setActionFeedback({
              type: "error",
              title: t("topicDetail.draft.loadFailed"),
              message: t("topicDetail.draft.missingUiRule"),
            });
            setEditorState(null);
          } else {
            const hydratedRoot = hydrateRootForEditor(draftResult.data.rule.root);
            setEditorState({
              rule: { ...draftResult.data.rule, root: hydratedRoot },
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
      await refreshGovernance(topicId);
      setLoading(false);
    }

    loadTopic();

    return () => {
      active = false;
    };
  }, [topicId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 p-6">
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
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <TopicHeaderTabs
            topicId={topicId}
            topicName={topicName}
            createdAt={topicCreatedAt}
            statusCode={topicStatus}
            statusText={getStatusLabel(topicStatus)}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            reviewRevision={latestRevision}
          />

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
          <TopicRuntimeStatusBar topicId={topicId} />

          <div className="min-h-0 flex-1">
            {activeTab === "RULE" &&
              (editorState ? (
              <RuleEditor
                topicId={topicId}
                rule={editorState.rule}
                capability={editorState.capability}
                topicName={topicName}
                status={topicStatus}
                templateLabel={templateLabel}
                capabilityLabel={editorState.capability.semantic.allowModes.join(" / ")}
                dirty={editorState.dirty}
                explain={editorState.explain as ExplainViewModel | null}
                actionBusy={actionBusy || executionLoading}
                saveDraftBusy={saveDraftBusy}
                deleteDraftBusy={deleteDraftBusy}
                submitReviewBusy={submitReviewBusy}
                publishBusy={publishBusy}
                onBack={() => router.push("/knowledge/topics")}
                onSave={actionsLocked ? undefined : handleSaveDraft}
                onDeleteDraft={actionsLocked ? undefined : handleDeleteDraft}
                onRunWorkspace={handleRunWorkspace}
                onRunNode={handleRunNode}
                onRunAbTest={handleRunAbTest}
                onSelectPreviewDocument={handleSelectPreviewDocument}
                onSubmit={actionsLocked ? undefined : handleSubmitReview}
                onPublish={actionsLocked ? undefined : handlePublish}
                previewResult={previewResult}
                previewDocument={previewDocument}
                previewDocumentBusy={previewDocumentBusy}
                previewError={executionError}
                previewBusy={executionLoading || abTestBusy}
                compiledGql={compiledGql}
                compiledGqlSource={compiledGqlSource}
                fullRuntimeResult={fullRuntimeResult}
                impactRuntimeResult={impactRuntimeResult}
                nodeRuntimeResults={nodeRuntimeResults}
                abTestResult={abTestResult}
                complexityMetricsOverride={complexityMetricsOverride}
                hitDistributionOverride={hitDistributionOverride}
                performanceMetricsOverride={performanceMetricsOverride}
                riskAssessmentOverride={riskAssessmentOverride}
                optimizationSuggestionsOverride={optimizationSuggestionsOverride}
                versionHistoryOverride={versionHistoryOverride}
                diffOverride={diffOverride}
                runtimeOptions={runtimeOptions}
                activeRuntimeId={activeRuntimeId}
                onChangeRuntime={setActiveRuntime}
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
                onTopicNameChange={setTopicName}
                readOnly={actionsLocked}
              />
            ) : (
              <div className="text-sm text-red-500">
                {t("topicDetail.draft.missingCapability")}
              </div>
              ))}
            {activeTab === "REVIEW" && (
              <div className="rounded-lg border bg-white p-5">
                <div className="text-sm font-semibold">{t("topicReviewTab.title")}</div>
                <div className="mt-2 text-sm text-slate-600">{t("topicReviewTab.description")}</div>
                <div className="mt-2 text-sm text-slate-700">
                  {t("topicReviewTab.latestRevision", {
                    revision: latestRevision == null ? "-" : latestRevision,
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    onClick={() => void handleSubmitReview()}
                    disabled={actionsLocked || submitReviewBusy}
                  >
                    {submitReviewBusy
                      ? t("topicActions.submittingReview")
                      : t("ruleEditor.header.submitReview")}
                  </button>
                  {latestRevision != null && (
                    <button
                      type="button"
                      className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                      onClick={() =>
                        router.push(`/knowledge/topics/${topicId}/reviews/${latestRevision}`)
                      }
                    >
                      {t("topicReviewTab.openReview")}
                    </button>
                  )}
                </div>
              </div>
            )}
            {activeTab === "PUBLISH" && (
              <div className="rounded-lg border bg-white p-5">
                <div className="text-sm font-semibold">{t("topicPublishTab.title")}</div>
                <div className="mt-2 text-sm text-slate-600">{t("topicPublishTab.description")}</div>
                <div className="mt-2 text-sm text-slate-700">
                  {t("topicPublishTab.latestRevision", {
                    revision: latestRevision == null ? "-" : latestRevision,
                  })}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    onClick={() => void handlePublish()}
                    disabled={actionsLocked || publishBusy}
                  >
                    {publishBusy ? t("topicActions.publishing") : t("ruleEditor.header.publish")}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "DEPLOY" && (
              <TopicDeployTab
                topicId={topicId}
                topicName={topicName}
                currentPublishedRevision={latestRevision}
                onRequestOpenPublish={() => setActiveTab("PUBLISH")}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

