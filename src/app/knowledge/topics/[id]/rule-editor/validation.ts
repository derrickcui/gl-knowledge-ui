import { t } from "@/i18n";
import type { RuleField, UiCapabilityViewModel, UiExpressionNode } from "./types";
import {
  canUseLogicOperator,
  canUseNot,
  canUsePositionMode,
  canUseTopicRef,
} from "./capability-policy";
import { isChildAllowedByMatrix } from "./nesting-matrix";
import { normalizeExpressionTree } from "./expression-normalizer";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  nodeId: string;
  message: string;
  severity: ValidationSeverity;
  type?: string;
}

export function validateTree(
  root: UiExpressionNode | null,
  capability: UiCapabilityViewModel
): ValidationIssue[] {
  if (!root) {
    return [
      {
        nodeId: "root",
        message: t("ruleEditor.validation.needAtLeastOneCondition"),
        severity: "error",
        type: "LOGIC_EMPTY",
      },
    ];
  }
  const issues: ValidationIssue[] = enforceLayerInvariant(root);
  visit(root, capability, issues, undefined, undefined, 0, "pre");
  const normalized = normalizeExpressionTree(root);
  normalized.issues.forEach((item) =>
    issues.push({ nodeId: item.nodeId, message: item.message, severity: "error" })
  );
  if (normalized.root) {
    visit(normalized.root, capability, issues, undefined, undefined, 0, "post");
  }
  return issues;
}

export function enforceLayerInvariant(root: UiExpressionNode | null): ValidationIssue[] {
  if (!root) {
    return [{ nodeId: "root", message: t("ruleEditor.validation.rootMustContainField"), severity: "error" }];
  }
  const issues: ValidationIssue[] = [];
  if (root.type !== "LOGIC") {
    issues.push({
      nodeId: root.id,
      message: t("ruleEditor.validation.rootMustContainField"),
      severity: "error",
      type: "ROOT_NOT_LOGIC",
    });
    return issues;
  }

  return issues;
}

function visit(
  node: UiExpressionNode,
  capability: UiCapabilityViewModel,
  issues: ValidationIssue[],
  parentType: UiExpressionNode["type"] | undefined,
  parentField?: RuleField,
  logicDepth = 0,
  phase: "pre" | "post" = "post"
) {
  if (node.type === "FIELD") {
    if (parentType && parentType !== "LOGIC" && parentType !== "NOT" && parentType !== "SCORE") {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.fieldNested"),
        severity: "error",
        type: "FIELD_NESTED",
      });
    }
    if (!capability.where.allowFields.includes(node.field)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedField"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.fieldIncomplete"), severity: "error" });
    } else if (isChildAllowedByMatrix(node.type, node.child.type, capability)) {
      if (node.child.type === "FIELD") {
        issues.push({
          nodeId: node.child.id,
          message: t("ruleEditor.validation.fieldNested"),
          severity: "error",
          type: "FIELD_NESTED",
        });
      }
      visit(node.child, capability, issues, node.type, node.field, logicDepth, phase);
    } else {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.fieldMustContainLogicOrStructure"),
        severity: "error",
        type: "FIELD_CHILD_INVALID",
      });
    }
    return;
  }

  if (node.type === "STRUCTURE") {
    if (parentField === "TITLE" || parentField === "COLUMN") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.titleColumnNoStructure"), severity: "error" });
    }
    if (!node.child || !isChildAllowedByMatrix(node.type, node.child.type, capability)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.structureMustContainLogic"), severity: "error" });
    } else {
      visit(node.child, capability, issues, node.type, parentField, logicDepth, phase);
    }
    return;
  }

  if (node.type === "LOGIC") {
    const nextLogicDepth = logicDepth + 1;
    if (
      parentType &&
      parentType !== "STRUCTURE" &&
      parentType !== "LOGIC" &&
      parentType !== "FIELD" &&
      parentType !== "NOT" &&
      parentType !== "SCORE"
    ) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.logicParentInvalid"), severity: "error" });
    }

    if (nextLogicDepth > 5) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.logic.depthWarning"), severity: "warning" });
    }

    if (node.children.length === 0) {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.needAtLeastOneCondition"),
        severity: "error",
        type: "LOGIC_EMPTY",
      });
    }

    if (!canUseLogicOperator(capability, node.operator)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedMode"), severity: "error" });
    }

    if (
      (node.operator === "AT_LEAST" ||
        node.operator === "LOGSUM" ||
        node.operator === "WEIGHTED" ||
        node.operator === "ACCRUE") &&
      node.children.length < 2
    ) {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.modeNeedTwoChildren"),
        severity: "error",
        type: "MODE_NEED_TWO_CHILDREN",
      });
    }

    if (node.threshold != null && node.operator !== "AT_LEAST" && node.operator !== "LOGSUM") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.thresholdNotSupported"), severity: "error" });
    }

    if (node.operator === "AT_LEAST" || node.operator === "LOGSUM") {
      const max = Math.max(1, node.children.length);
      const threshold = Math.round(Number(node.threshold ?? (node.children.length >= 2 ? 2 : 1)));
      if (!Number.isFinite(threshold) || threshold < 1) {
        issues.push({ nodeId: node.id, message: t("ruleEditor.validation.thresholdInvalid"), severity: "error" });
      } else if (threshold > max) {
        issues.push({ nodeId: node.id, message: t("ruleEditor.validation.thresholdExceeds", { max }), severity: "error" });
      }
    }

    node.children.forEach((child) => {
      if (!isChildAllowedByMatrix(node.type, child.type, capability)) {
        issues.push({
          nodeId: child.id,
          message: t("ruleEditor.validation.fieldStructureNotAllowedInLogic"),
          severity: "error",
        });
      }
      visit(child, capability, issues, node.type, parentField, nextLogicDepth, phase);
    });
    return;
  }

  if (node.type === "POSITION_RELATION") {
    if (parentType !== "LOGIC") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationUnderLogic"), severity: "error" });
    }
    if (node.mode !== "PROXIMITY" && node.mode !== "ORDER") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationModeUnsupported"), severity: "error" });
    }
    if (node.mode === "PROXIMITY" && !canUsePositionMode(capability, "PROXIMITY")) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedRelation"), severity: "error" });
    }
    if (node.mode === "ORDER" && !canUsePositionMode(capability, "ORDER")) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedOrder"), severity: "error" });
    }
    const relation = node.relation ?? "NEAR";
    if (relation !== "NEAR" && relation !== "SENTENCE" && relation !== "PARAGRAPH") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationModeUnsupported"), severity: "error" });
    }
    if (node.children.length < 2) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.proximityNeedTwoTerms"), severity: "error" });
    }
    if (node.children.length > 5) {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.proximityMaxTerms", { max: 5 }),
        severity: "error",
        type: "PROXIMITY_MAX_TERMS",
      });
    }
    if (node.children.some((child) => child.type !== "TERM_SET")) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationOnlyTermSet"), severity: "error" });
    }
    if (
      (relation === "NEAR" && !capability.structure.allowRelation.includes("NEAR") && !capability.structure.allowDistance) ||
      (relation === "SENTENCE" && !capability.structure.allowRelation.includes("SENTENCE")) ||
      (relation === "PARAGRAPH" && !capability.structure.allowRelation.includes("PARAGRAPH"))
    ) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedRelation"), severity: "error" });
    }
    if (relation !== "NEAR" && node.distance != null) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationDistanceOnlyNear"), severity: "error" });
    }
    if (relation === "NEAR" && node.distance != null && !capability.structure.allowDistance) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedDistance"), severity: "error" });
    }
    if (node.ordered && !capability.structure.allowOrder) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedOrder"), severity: "error" });
    }
    node.children.forEach((child) => visit(child, capability, issues, node.type, parentField, logicDepth, phase));
    return;
  }

  if (node.type === "PROXIMITY") {
    if (parentType !== "LOGIC" && parentType !== "FIELD" && parentType !== "NOT" && parentType !== "SCORE") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.logicParentInvalid"), severity: "error" });
    }
    if (node.children.length < 2) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.proximityNeedTwoTerms"), severity: "error" });
    }
    if (node.children.length > 5) {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.proximityMaxTerms", { max: 5 }),
        severity: "error",
        type: "PROXIMITY_MAX_TERMS",
      });
    }
    if (phase === "post" && node.children.some((child) => child.type !== "TERM_SET")) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationOnlyTermSet"), severity: "error" });
    }
    if (phase === "pre") {
      const fields = node.children
        .filter((child): child is Extract<UiExpressionNode, { type: "FIELD" }> => child.type === "FIELD")
        .map((child) => child.field);
      if (fields.length > 0 && new Set(fields).size > 1) {
        issues.push({
          nodeId: node.id,
          message: t("ruleEditor.validation.fieldScopeConflict"),
          severity: "error",
          type: "FIELD_CONFLICT",
        });
      }
    }
    node.children.forEach((child) => visit(child, capability, issues, node.type, parentField, logicDepth, phase));
    return;
  }

  if (node.type === "NOT") {
    if (!canUseNot(capability)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedNot"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.notIncomplete"), severity: "error" });
      return;
    }
    if (!isChildAllowedByMatrix(node.type, node.child.type, capability)) {
      issues.push({ nodeId: node.child.id, message: t("ruleEditor.validation.unsupportedNodeType"), severity: "error" });
      return;
    }
    visit(node.child, capability, issues, node.type, parentField, logicDepth, phase);
    return;
  }

  if (node.type === "SCORE") {
    if (!capability.advanced.allowScore) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedScore"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.scoreIncomplete"), severity: "error" });
      return;
    }
    if (!isChildAllowedByMatrix(node.type, node.child.type, capability)) {
      issues.push({ nodeId: node.child.id, message: t("ruleEditor.validation.unsupportedNodeType"), severity: "error" });
      return;
    }
    visit(node.child, capability, issues, node.type, parentField, logicDepth, phase);
    return;
  }

  if (node.type === "TOPIC_REF") {
    if (!canUseTopicRef(capability)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedTopicRef"), severity: "error" });
    }
    if (!node.topicId.trim()) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.topicRefUnselected"), severity: "error" });
    }
    return;
  }

  if (node.type === "TERM_SET" && node.terms.length === 0) {
    issues.push({ nodeId: node.id, message: t("ruleEditor.validation.needAtLeastOneTerm"), severity: "error" });
  }
}
