"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
} from "@/lib/topic-api";
import {
  businessRuleToRuleNode,
  ruleNodeToBusinessRule,
} from "@/lib/business-rule";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { RuleNode, cloneRule } from "@/components/rule-builder/astTypes";
import { applyOperator } from "@/components/rule-builder/applyOperator";
import { compileOperator } from "@/components/rule-builder/operatorCompiler";
import { getNodeByPath } from "@/components/rule-builder/astEditor";
import { isValidPath } from "@/components/rule-builder/pathUtils";
import { parseFocusPath } from "@/components/rule-builder/focusQuery";
import FromReviewBanner from "@/components/review/FromReviewBanner";
import ConceptPickerModal from "@/components/glossary/ConceptPickerModal";
import { buildConceptAstFromDraft } from "@/components/rule-builder/conceptConditionCompiler";
import { ConceptConditionDraft } from "@/components/glossary/conceptConditionDraft";
import { fetchReviewPacketBusiness } from "@/components/review/reviewApi";
import TopicPickerModal from "@/components/topics/TopicPickerModal";
import { TopicConditionDraft } from "@/components/topics/topicConditionDraft";
import { buildTopicAstFromDraft } from "@/components/rule-builder/topicConditionCompiler";
import { decodeUnicodeEscapes } from "@/lib/text-utils";
import {
  normalizeForRuleBuilder,
  createScenario,
  addScenario,
} from "@/components/rule-builder/ruleGroupOps";
import { TopicHeader } from "./topic-header";
import OperatorPalette from "@/components/rule-palette/operatorPalette";
import { RuleBuilder } from "./rule-builder";
import { ExplainPreview } from "./explain-preview";
import { TopicActions } from "./topic-actions";
import { t } from "@/i18n";

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
  const [previewGql, setPreviewGql] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(320);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const dragRef = useRef<{
    side: "left" | "right";
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);
  const [topicName, setTopicName] = useState(t("common.topic"));
  const [topicStatus, setTopicStatus] = useState("DRAFT");
  const [topicDescription, setTopicDescription] = useState<string>("");
  const [rule, setRule] = useState<RuleNode>(() =>
    normalizeForRuleBuilder({
      type: "GROUP",
      params: { operator: "ANY", role: "RULE", sticky: true },
      children: [createScenario(0)],
    })
  );
  const [activePath, setActivePath] = useState<number[]>([0]);
  const [hoverPath, setHoverPath] = useState<number[] | null>(null);
  const [hoverConditionId, setHoverConditionId] = useState<string | undefined>(
    undefined
  );
  const [selectedConditionId, setSelectedConditionId] = useState<
    string | undefined
  >(undefined);
  const [reviewReason, setReviewReason] = useState<string | null>(null);
  const [conceptPickerOpen, setConceptPickerOpen] = useState(false);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [pendingOperatorId, setPendingOperatorId] = useState<string | null>(
    null
  );
  const [selectedOperatorId, setSelectedOperatorId] = useState<
    string | null
  >(null);
  const [editingDraft, setEditingDraft] = useState<{
    operatorId: string;
    scenarioIndex: number;
    conditionIndex?: number;
    conditionId?: string;
    initialDraft?: ConceptConditionDraft | null;
  } | null>(null);
  const [editingTopicDraft, setEditingTopicDraft] = useState<{
    operatorId: string;
    scenarioIndex: number;
    conditionIndex?: number;
    conditionId?: string;
    initialDraft?: TopicConditionDraft | null;
    lockSelection?: boolean;
  } | null>(null);

  const scenarioPath: number[] =
    activePath.length > 0 ? [activePath[0]] : [0];
  const activeConditionId = hoverConditionId ?? selectedConditionId;
  const isEditingDraft =
    conceptPickerOpen ||
    topicPickerOpen ||
    editingDraft !== null ||
    editingTopicDraft !== null;
  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  function buildExplainFromDraft(draft: ConceptConditionDraft) {
    const parts: string[] = [];
    if (draft.location.inBody) parts.push(t("explain.concept.loc.body"));
    if (draft.location.inTitle) parts.push(t("explain.concept.loc.title"));
    if (draft.location.inParagraph) {
      parts.push(t("explain.concept.loc.paragraph"));
    }
    if (draft.location.inSentence) {
      parts.push(t("explain.concept.loc.sentence"));
    }
    const loc = parts.length
      ? `${t("explain.concept.loc.document")}${parts.join(" / ")}`
      : t("explain.concept.loc.documentContent");
    const scope =
      draft.scope.mode === "SELF"
        ? t("explain.concept.scope.self")
        : draft.scope.mode === "DESCENDANT"
        ? t("explain.concept.scope.descendant")
        : t("explain.concept.scope.custom");
    return t("explain.concept.template", {
      loc,
      concept: draft.concept.name,
      scope,
    });
  }

  function buildTopicExplainFromDraft(draft: TopicConditionDraft) {
    const parts: string[] = [];
    if (draft.location.inBody) parts.push(t("explain.topic.loc.body"));
    if (draft.location.inTitle) parts.push(t("explain.topic.loc.title"));
    const loc = parts.length
      ? `${t("explain.topic.loc.document")}${parts.join(" / ")}`
      : t("explain.topic.loc.documentContent");
    const safeTopicName = decodeUnicodeEscapes(draft.topic.name);
    return t("explain.topic.template", {
      loc,
      topic: safeTopicName,
    });
  }
  function buildDraftFromPath(scenarioIndex: number, conditionIndex: number) {
    const business = ruleNodeToBusinessRule(rule);
    const group = business.groups[scenarioIndex];
    if (!group) return null;
    const condition = group.conditions[conditionIndex];
    if (!condition || condition.kind !== "CONCEPT") return null;
    const payload = condition.payload;
    const draft: ConceptConditionDraft = {
      concept: {
        id: payload.conceptId,
        name: payload.conceptName ?? "",
        hasChildren: false,
      },
      scope: {
        mode: payload.scope,
        selectedChildIds: payload.selectedChildIds ?? [],
        selectedChildNames: payload.selectedChildNames ?? [],
      },
      location: payload.location,
      explainPreview:
        condition.explain?.text ??
        buildExplainFromDraft({
          concept: {
            id: payload.conceptId,
            name: payload.conceptName ?? "",
            hasChildren: false,
          },
          scope: {
            mode: payload.scope,
            selectedChildIds: payload.selectedChildIds ?? [],
            selectedChildNames: payload.selectedChildNames ?? [],
          },
          location: payload.location,
          explainPreview: "",
          validation: { valid: true },
        }),
      validation: { valid: true },
    };
    return { draft, scenarioIndex, conditionIndex };
  }

  function buildTopicDraftFromNode(node: RuleNode) {
    const defaultLocation = {
      inBody: true,
      inTitle: false,
      inParagraph: false,
      inSentence: false,
    };

    const mergeLocations = (
      left: typeof defaultLocation,
      right: typeof defaultLocation
    ) => ({
      inBody: left.inBody || right.inBody,
      inTitle: left.inTitle || right.inTitle,
      inParagraph: left.inParagraph || right.inParagraph,
      inSentence: left.inSentence || right.inSentence,
    });

    const unwrapLocations = (current: RuleNode) => {
      if (current.type === "FIELD_CONDITION") {
        const child = current.children?.[0];
        if (!child) return { base: current, location: defaultLocation };
        if (current.params?.field === "TITLE") {
          const inner = unwrapLocations(child);
          return {
            base: inner.base,
            location: {
              ...inner.location,
              inTitle: true,
              inBody: false,
            },
          };
        }
      }
      if (current.type === "PROXIMITY") {
        const child = current.children?.[0];
        if (!child) return { base: current, location: defaultLocation };
        const inner = unwrapLocations(child);
        if (current.params?.mode === "PARAGRAPH") {
          return {
            base: inner.base,
            location: {
              ...inner.location,
              inParagraph: true,
              inBody: false,
            },
          };
        }
        if (current.params?.mode === "SENTENCE") {
          return {
            base: inner.base,
            location: {
              ...inner.location,
              inSentence: true,
              inBody: false,
            },
          };
        }
      }
      return { base: current, location: defaultLocation };
    };

    const buildDraft = (
      topicNode: RuleNode,
      location: typeof defaultLocation
    ): TopicConditionDraft | null => {
      if (topicNode.type !== "TOPIC_REF") return null;
      const draft: TopicConditionDraft = {
        topic: {
          id: topicNode.params?.topicId ?? "",
          name: decodeUnicodeEscapes(topicNode.params?.topicName ?? ""),
          status: topicNode.params?.topicStatus,
          version: topicNode.params?.topicVersion,
        },
        location,
        rangeMode: location.inBody && location.inTitle ? "ALL" : "LIMITED",
        useOriginalRule: !!topicNode.params?.useOriginalRule,
        explainPreview: buildTopicExplainFromDraft({
          topic: {
            id: topicNode.params?.topicId ?? "",
            name: topicNode.params?.topicName ?? "",
            status: topicNode.params?.topicStatus,
            version: topicNode.params?.topicVersion,
          },
          location,
          rangeMode: location.inBody && location.inTitle ? "ALL" : "LIMITED",
          explainPreview: "",
          validation: { valid: true },
        }),
        validation: { valid: true },
      };
      return draft;
    };

    if (node.type === "GROUP" && node.params?.operator === "ANY") {
      const children = node.children ?? [];
      if (!children.length) return null;
      const unwrapped = children.map((child) => unwrapLocations(child));
      const topicNodes = unwrapped.map((entry) => entry.base);
      if (topicNodes.some((child) => child.type !== "TOPIC_REF")) {
        return null;
      }
      const first = topicNodes[0];
      const sameTopic = topicNodes.every(
        (item) => item.params?.topicId === first.params?.topicId
      );
      if (!sameTopic) return null;
      const location = unwrapped.reduce(
        (acc, cur) => mergeLocations(acc, cur.location),
        unwrapped[0].location
      );
      return buildDraft(first, location);
    }

    const unwrapped = unwrapLocations(node);
    return buildDraft(unwrapped.base, unwrapped.location);
  }
  function buildConditionPathMap(root: RuleNode): Map<string, number[]> {
    const map = new Map<string, number[]>();
    const walk = (node: RuleNode, path: number[]) => {
      if (node.id) {
        map.set(node.id, path);
      }
      if (node.children) {
        node.children.forEach((child, idx) => walk(child, [...path, idx]));
      }
    };
    walk(root, []);
    return map;
  }

  function replaceNodeAtPath(
    root: RuleNode,
    path: number[],
    nextNode: RuleNode
  ): RuleNode {
    const draft = cloneRule(root);
    if (path.length === 0) return nextNode;
    let cursor: RuleNode = draft;
    for (let i = 0; i < path.length - 1; i += 1) {
      const idx = path[i];
      if (!cursor.children || !cursor.children[idx]) {
        return draft;
      }
      cursor = cursor.children[idx];
    }
    const last = path[path.length - 1];
    if (!cursor.children || !cursor.children[last]) return draft;
    cursor.children[last] = nextNode;
    return draft;
  }

  function handleAddScenario() {
    setRule((prev) => {
      const next = addScenario(prev);
      const count = normalizeForRuleBuilder(next).children?.length ?? 1;
      setActivePath([Math.max(0, count - 1)]);
      return next;
    });
  }

  async function handleSaveDraft() {
    if (!topicId || topicStatus === "IN_REVIEW") return;
    setActionBusy(true);
    setActionFeedback(null);

    const businessRule = ruleNodeToBusinessRule(rule);
    const result = await saveTopicDraft(topicId, {
      rule: businessRule,
    });

    if (result.data) {
      const mergedRule = {
        ...result.data.rule,
        logic: businessRule.logic ?? result.data.rule.logic ?? "ANY",
      };
      setRule(normalizeForRuleBuilder(businessRuleToRuleNode(mergedRule)));
      setActionFeedback({
        type: "success",
        title: t("topicDetail.draft.saved"),
      });
    } else {
      setActionFeedback({
        type: "error",
        title: t("topicDetail.draft.saveFailed"),
        message: result.error ?? t("topicDetail.draft.saveFailedMessage"),
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
      router.push("/knowledge/topics");
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

  async function handlePreviewGql() {
    if (!topicId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    const businessRule = ruleNodeToBusinessRule(rule);
    const result = await previewTopicRule(topicId, {
      rule: businessRule,
    });
    if (result.data) {
      setPreviewGql(result.data.generatedGql ?? null);
      if (!result.data.generatedGql) {
        setPreviewError(t("topicDetail.preview.empty"));
      }
    } else {
      setPreviewError(result.error ?? t("topicDetail.preview.failed"));
    }
    setPreviewLoading(false);
  }
  useEffect(() => {
    const focus = parseFocusPath(searchParams.get("focus"));
    if (focus) {
      setActivePath(focus);
    }
  }, [searchParams]);

  useEffect(() => {
    function handleMove(event: MouseEvent) {
      if (!dragRef.current) return;
      const { side, startX, startLeft, startRight } = dragRef.current;
      const delta = event.clientX - startX;
      if (side === "left") {
        setLeftWidth(clamp(startLeft + delta, 180, 420));
      } else {
        setRightWidth(clamp(startRight - delta, 260, 520));
      }
    }
    function handleUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      setDragging(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    if (dragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging]);

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
        setTopicDescription(
          result.data.description ?? t("topicDetail.description.empty")
        );
      } else {
        setError(result.error ?? t("topicDetail.loadFailed"));
      }

      const draftResult = await fetchTopicDraft(topicId);
      if (draftResult.data?.rule) {
        setRule(
          normalizeForRuleBuilder(
            businessRuleToRuleNode(draftResult.data.rule)
          )
        );
      } else {
        setRule((prev) => normalizeForRuleBuilder(prev));
        if (draftResult.error) {
          setActionFeedback({
            type: "error",
            title: t("topicDetail.draft.loadFailed"),
            message: draftResult.error,
          });
        }
      }
      setActivePath((prevPath) => {
        if (prevPath.length === 0) return [0];
        return prevPath;
      });
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
          <ConceptPickerModal
            open={conceptPickerOpen}
            onClose={() => {
              setConceptPickerOpen(false);
              setPendingOperatorId(null);
              setSelectedOperatorId(null);
              setEditingDraft(null);
            }}
            onConfirm={(draft) => {
              if (!pendingOperatorId) return;
              const astNode = buildConceptAstFromDraft(draft);
              astNode.explain = {
                mode: "AUTO",
                text: draft.explainPreview,
              };
              const isEditing =
                editingDraft?.conditionId ||
                editingDraft?.conditionIndex !== undefined;

              if (isEditing) {
                setRule((prev) => {
                  const next = normalizeForRuleBuilder(prev);
                  const map = buildConditionPathMap(next);
                  const targetPath =
                    (editingDraft?.conditionId &&
                      map.get(editingDraft.conditionId)) ||
                    (editingDraft && editingDraft.conditionIndex !== undefined
                      ? [
                          editingDraft.scenarioIndex,
                          editingDraft.conditionIndex,
                        ]
                      : null);
                  if (!targetPath) return next;
                  astNode.id = editingDraft?.conditionId ?? astNode.id;
                  const replaced = replaceNodeAtPath(next, targetPath, astNode);
                  return normalizeForRuleBuilder(replaced);
                });
              } else {
                setRule((prev) => {
                  const next = normalizeForRuleBuilder(prev);
                  const scenarioIndex = scenarioPath[0] ?? 0;
                  const scenario = next.children?.[scenarioIndex];
                  if (!scenario) return prev;
                  const nextChildren = [...(scenario.children ?? [])];
                  nextChildren.push(astNode);
                  const nextScenario = {
                    ...scenario,
                    children: nextChildren,
                  };
                  return {
                    ...next,
                    children: (next.children ?? []).map((child, idx) =>
                      idx === scenarioIndex ? nextScenario : child
                    ),
                  };
                });
              }
              setConceptPickerOpen(false);
              setPendingOperatorId(null);
              setSelectedOperatorId(null);
              setEditingDraft(null);
            }}
            initialDraft={editingDraft?.initialDraft ?? null}
          />
          <TopicPickerModal
            open={topicPickerOpen}
            lockTopicSelection={!!editingTopicDraft?.lockSelection}
            onClose={() => {
              setTopicPickerOpen(false);
              setPendingOperatorId(null);
              setSelectedOperatorId(null);
              setEditingTopicDraft(null);
            }}
            onConfirm={(draft) => {
              if (pendingOperatorId !== "what.topicRef") return;
              const astNode = buildTopicAstFromDraft(draft);
              astNode.explain = {
                mode: "AUTO",
                text: draft.explainPreview,
              };
              const isEditing =
                editingTopicDraft?.conditionId ||
                editingTopicDraft?.conditionIndex !== undefined;

              if (isEditing) {
                setRule((prev) => {
                  const next = normalizeForRuleBuilder(prev);
                  const map = buildConditionPathMap(next);
                  const targetPath =
                    (editingTopicDraft?.conditionId &&
                      map.get(editingTopicDraft.conditionId)) ||
                    (editingTopicDraft &&
                    editingTopicDraft.conditionIndex !== undefined
                      ? [
                          editingTopicDraft.scenarioIndex,
                          editingTopicDraft.conditionIndex,
                        ]
                      : null);
                  if (!targetPath) return next;
                  astNode.id = editingTopicDraft?.conditionId ?? astNode.id;
                  const replaced = replaceNodeAtPath(next, targetPath, astNode);
                  return normalizeForRuleBuilder(replaced);
                });
              } else {
                setRule((prev) => {
                  const next = normalizeForRuleBuilder(prev);
                  const scenarioIndex = scenarioPath[0] ?? 0;
                  const scenario = next.children?.[scenarioIndex];
                  if (!scenario) return prev;
                  const nextChildren = [...(scenario.children ?? [])];
                  nextChildren.push(astNode);
                  const nextScenario = {
                    ...scenario,
                    children: nextChildren,
                  };
                  return {
                    ...next,
                    children: (next.children ?? []).map((child, idx) =>
                      idx === scenarioIndex ? nextScenario : child
                    ),
                  };
                });
              }
              setTopicPickerOpen(false);
              setPendingOperatorId(null);
              setSelectedOperatorId(null);
              setEditingTopicDraft(null);
            }}
            initialDraft={editingTopicDraft?.initialDraft ?? null}
          />
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            href="/knowledge/topics"
          >
            {t("topicDetail.back")}
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
              title={t("topicDetail.review.lockedTitle")}
              message={t("topicDetail.review.lockedMessage")}
            />
          )}

          <div className="flex min-h-0 gap-0">
            <div className="flex-shrink-0" style={{ width: leftWidth }}>
              <OperatorPalette
                activeNode={
                  isValidPath(rule, activePath)
                    ? getNodeByPath(rule, activePath)
                    : rule
                }
                disabled={topicStatus === "IN_REVIEW" || isEditingDraft}
                selectedId={selectedOperatorId}
                mode="advanced"
                featureFlags={{ showAdvanced: true, how: true, topicRef: true }}
                onAddScenario={handleAddScenario}
                onSelect={(item) => {
                  if (topicStatus === "IN_REVIEW") return;
                  if (isEditingDraft) {
                    setActionFeedback({
                      type: "info",
                      title: t("topicDetail.tip.finishCurrent"),
                    });
                    return;
                  }
                  setSelectedOperatorId(item.id);
                  if (
                    (item.id.startsWith("where.") ||
                      item.id.startsWith("score.")) &&
                    activePath.length <= 1
                  ) {
                    setActionFeedback({
                      type: "info",
                      title: t("topicDetail.tip.selectCondition"),
                    });
                    setSelectedOperatorId(null);
                    return;
                  }
                  if (item.id.startsWith("how.") && activePath.length !== 1) {
                    setActionFeedback({
                      type: "info",
                      title: t("topicDetail.tip.selectScenario"),
                    });
                    setSelectedOperatorId(null);
                    return;
                  }
                  if (item.requires === "concept") {
                    const scenarioIndex = scenarioPath[0] ?? 0;
                    const conditionIndex =
                      activePath.length > 1 ? activePath[1] : undefined;
                    const existing =
                      conditionIndex !== undefined
                        ? buildDraftFromPath(scenarioIndex, conditionIndex)
                        : null;
                    const scenario = rule.children?.[scenarioIndex];
                    const node = scenario?.children?.[conditionIndex ?? -1];
                    setPendingOperatorId(item.id);
                    setEditingDraft({
                      operatorId: item.id,
                      scenarioIndex,
                      conditionIndex:
                        existing?.conditionIndex ?? conditionIndex,
                      conditionId: node?.id,
                      initialDraft: existing?.draft ?? null,
                    });
                    setConceptPickerOpen(true);
                    return;
                  }
                  if (item.requires === "topic") {
                    const scenarioIndex = scenarioPath[0] ?? 0;
                    const conditionIndex =
                      activePath.length > 1 ? activePath[1] : undefined;
                    const scenario = rule.children?.[scenarioIndex];
                    const node = scenario?.children?.[conditionIndex ?? -1];
                    const draft = node ? buildTopicDraftFromNode(node) : null;
                    setPendingOperatorId(item.id);
                    setEditingTopicDraft({
                      operatorId: item.id,
                      scenarioIndex,
                      conditionIndex,
                      conditionId: node?.id,
                      initialDraft: draft,
                      lockSelection: false,
                    });
                    setTopicPickerOpen(true);
                    return;
                  }
                  const operation = compileOperator(item.id);
                  setRule((prev) => applyOperator(prev, scenarioPath, operation));
                  setSelectedOperatorId(null);
                }}
              />
            </div>
            <div
              role="separator"
              aria-label="Resize palette"
              className="w-1.5 cursor-col-resize bg-transparent hover:bg-slate-200"
              onMouseDown={(event) => {
                event.preventDefault();
                dragRef.current = {
                  side: "left",
                  startX: event.clientX,
                  startLeft: leftWidth,
                  startRight: rightWidth,
                };
                setDragging("left");
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            />
            <div className="min-w-[360px] flex-1 px-2">
              <RuleBuilder
                rule={rule}
                activePath={activePath}
                hoverPath={hoverPath}
                highlightedConditionId={activeConditionId}
                onSelect={setActivePath}
                onChange={(next) => setRule(normalizeForRuleBuilder(next))}
                onAddScenario={handleAddScenario}
                onEditCondition={(scenarioIndex, conditionIndex) => {
                  const scenario = rule.children?.[scenarioIndex];
                  const node = scenario?.children?.[conditionIndex];
                  if (!node) return;
                  const topicDraft = buildTopicDraftFromNode(node);
                  if (topicDraft) {
                    setActivePath([scenarioIndex, conditionIndex]);
                    setEditingTopicDraft({
                      operatorId: "what.topicRef",
                      scenarioIndex,
                      conditionIndex,
                      conditionId: node.id,
                      initialDraft: topicDraft,
                      lockSelection: true,
                    });
                    setPendingOperatorId("what.topicRef");
                    setTopicPickerOpen(true);
                    return;
                  }
                  const found = buildDraftFromPath(scenarioIndex, conditionIndex);
                  if (!found) return;
                  setActivePath([scenarioIndex, conditionIndex]);
                  setEditingDraft({
                    operatorId: "what.concept",
                    scenarioIndex: found.scenarioIndex,
                    conditionIndex: found.conditionIndex,
                    conditionId: node.id,
                    initialDraft: found.draft,
                  });
                  setPendingOperatorId("what.concept");
                  setConceptPickerOpen(true);
                }}
                readOnly={topicStatus === "IN_REVIEW"}
              />
            </div>
            <div
              role="separator"
              aria-label="Resize preview"
              className="w-1.5 cursor-col-resize bg-transparent hover:bg-slate-200"
              onMouseDown={(event) => {
                event.preventDefault();
                dragRef.current = {
                  side: "right",
                  startX: event.clientX,
                  startLeft: leftWidth,
                  startRight: rightWidth,
                };
                setDragging("right");
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
            />
            <div className="flex-shrink-0" style={{ width: rightWidth }}>
              <ExplainPreview
                rule={rule}
                activeConditionId={activeConditionId}
                onHoverCondition={(id) => setHoverConditionId(id)}
                onClickCondition={(id) => {
                  if (!id) return;
                  const map = buildConditionPathMap(rule);
                  const path = map.get(id);
                  if (!path) return;
                  setSelectedConditionId(id);
                  setActivePath(path);
                  setHoverPath(null);
                }}
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
                    ? t("topicDetail.rule.emptyHint")
                    : undefined
                }
                previewGql={previewGql}
                previewError={previewError}
                previewLoading={previewLoading}
                onPreviewGql={handlePreviewGql}
              />
            </div>
          </div>

          <TopicActions
            status={topicStatus}
            busy={actionBusy}
            onDeleteDraft={handleDeleteDraft}
            onSaveDraft={handleSaveDraft}
            onSubmitReview={handleSubmitReview}
            onPublish={handlePublish}
            showSubmitReview={false}
          />
        </>
      )}
    </div>
  );
}
