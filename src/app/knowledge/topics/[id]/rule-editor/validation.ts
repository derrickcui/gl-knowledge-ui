import { t } from "@/i18n";
import type { RuleField, UiCapabilityViewModel, UiExpressionNode } from "./types";
import { canUseLogicOperator } from "./capability-policy";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  nodeId: string;
  message: string;
  severity: ValidationSeverity;
}

export function validateTree(
  root: UiExpressionNode | null,
  capability: UiCapabilityViewModel
): ValidationIssue[] {
  if (!root) {
    return [{ nodeId: "root", message: t("ruleEditor.validation.needAtLeastOneCondition"), severity: "error" }];
  }
  const issues: ValidationIssue[] = enforceLayerInvariant(root);
  visit(root, capability, issues, undefined);
  return issues;
}

export function enforceLayerInvariant(root: UiExpressionNode | null): ValidationIssue[] {
  if (!root) {
    return [{ nodeId: "root", message: t("ruleEditor.validation.rootMustContainField"), severity: "error" }];
  }
  const issues: ValidationIssue[] = [];
  if (root.type !== "FIELD") {
    issues.push({ nodeId: root.id, message: t("ruleEditor.validation.rootMustContainField"), severity: "error" });
    return issues;
  }

  if (!root.child) {
    issues.push({
      nodeId: root.id,
      message: t("ruleEditor.validation.fieldMustContainLogicOrStructure"),
      severity: "error",
    });
  } else if (root.child.type === "STRUCTURE") {
    if (!root.child.child || root.child.child.type !== "LOGIC") {
      issues.push({
        nodeId: root.child.id,
        message: t("ruleEditor.validation.structureMustContainLogic"),
        severity: "error",
      });
    }
  } else if (root.child.type !== "LOGIC") {
    issues.push({
      nodeId: root.id,
      message: t("ruleEditor.validation.fieldMustContainLogicOrStructure"),
      severity: "error",
    });
  }

  const counters = countLayerNodes(root);
  if (counters.field !== 1) {
    issues.push({ nodeId: root.id, message: t("ruleEditor.validation.onlyOneFieldAllowed"), severity: "error" });
  }
  if (counters.structure > 1) {
    issues.push({ nodeId: root.id, message: t("ruleEditor.validation.onlyOneStructureLayer"), severity: "error" });
  }

  return issues;
}

function countLayerNodes(node: UiExpressionNode): { field: number; structure: number } {
  switch (node.type) {
    case "FIELD": {
      const child = node.child ? countLayerNodes(node.child) : { field: 0, structure: 0 };
      return { field: child.field + 1, structure: child.structure };
    }
    case "STRUCTURE": {
      const child = node.child ? countLayerNodes(node.child) : { field: 0, structure: 0 };
      return { field: child.field, structure: child.structure + 1 };
    }
    case "LOGIC":
    case "POSITION_RELATION":
    case "PROXIMITY":
      return node.children.reduce(
        (acc, child) => {
          const count = countLayerNodes(child);
          return { field: acc.field + count.field, structure: acc.structure + count.structure };
        },
        { field: 0, structure: 0 }
      );
    case "NOT":
    case "SCORE":
      return node.child ? countLayerNodes(node.child) : { field: 0, structure: 0 };
    case "TERM_SET":
    case "TOPIC_REF":
      return { field: 0, structure: 0 };
  }
}

function visit(
  node: UiExpressionNode,
  capability: UiCapabilityViewModel,
  issues: ValidationIssue[],
  parentType: UiExpressionNode["type"] | undefined,
  parentField?: RuleField,
  logicDepth = 0
) {
  if (node.type === "FIELD") {
    if (parentType) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.fieldNested"), severity: "error" });
    }
    if (!capability.where.allowFields.includes(node.field)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedField"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.fieldIncomplete"), severity: "error" });
    } else if (node.child.type === "STRUCTURE" || node.child.type === "LOGIC") {
      visit(node.child, capability, issues, node.type, node.field, logicDepth);
    } else {
      issues.push({
        nodeId: node.id,
        message: t("ruleEditor.validation.fieldMustContainLogicOrStructure"),
        severity: "error",
      });
    }
    return;
  }

  if (node.type === "STRUCTURE") {
    if (parentType !== "FIELD") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.structureUnderField"), severity: "error" });
    }
    if (parentField === "TITLE" || parentField === "COLUMN") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.titleColumnNoStructure"), severity: "error" });
    }
    if (!node.child || node.child.type !== "LOGIC") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.structureMustContainLogic"), severity: "error" });
    } else {
      visit(node.child, capability, issues, node.type, parentField, logicDepth);
    }
    return;
  }

  if (node.type === "LOGIC") {
    const nextLogicDepth = logicDepth + 1;
    if (parentType !== "STRUCTURE" && parentType !== "LOGIC" && parentType !== "FIELD") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.logicParentInvalid"), severity: "error" });
    }

    if (nextLogicDepth > 5) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.logic.depthWarning"), severity: "warning" });
    }

    if (node.children.length === 0) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.needAtLeastOneCondition"), severity: "error" });
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
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.modeNeedTwoChildren"), severity: "error" });
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

    const hasPositionChild = node.children.some((child) => child.type === "POSITION_RELATION");
    const hasTermChild = node.children.some((child) => child.type === "TERM_SET");
    if (hasPositionChild && hasTermChild) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationParallelTermSet"), severity: "error" });
    }

    node.children.forEach((child) => {
      if (child.type === "FIELD" || child.type === "STRUCTURE") {
        issues.push({ nodeId: child.id, message: t("ruleEditor.validation.fieldStructureNotAllowedInLogic"), severity: "error" });
      }
      if (child.type === "PROXIMITY") {
        issues.push({ nodeId: child.id, message: t("ruleEditor.validation.legacyProximityDetected"), severity: "error" });
      }
      if (child.type === "NOT" || child.type === "SCORE" || child.type === "TOPIC_REF") {
        issues.push({ nodeId: child.id, message: t("ruleEditor.validation.unsupportedNodeType"), severity: "error" });
      }
      visit(child, capability, issues, node.type, parentField, nextLogicDepth);
    });
    return;
  }

  if (node.type === "POSITION_RELATION") {
    if (parentType !== "LOGIC") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationUnderLogic"), severity: "error" });
    }
    if (node.mode !== "PROXIMITY") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationModeUnsupported"), severity: "error" });
    }
    const relation = node.relation ?? "NEAR";
    if (relation !== "NEAR" && relation !== "SENTENCE" && relation !== "PARAGRAPH") {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.positionRelationModeUnsupported"), severity: "error" });
    }
    if (node.children.length < 2) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.proximityNeedTwoTerms"), severity: "error" });
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
    node.children.forEach((child) => visit(child, capability, issues, node.type, parentField, logicDepth));
    return;
  }

  if (node.type === "PROXIMITY") {
    issues.push({ nodeId: node.id, message: t("ruleEditor.validation.legacyProximityDetected"), severity: "error" });
    return;
  }

  if (node.type === "NOT" || node.type === "SCORE" || node.type === "TOPIC_REF") {
    issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedNodeType"), severity: "error" });
    return;
  }

  if (node.type === "TERM_SET" && node.terms.length === 0) {
    issues.push({ nodeId: node.id, message: t("ruleEditor.validation.needAtLeastOneTerm"), severity: "error" });
  }
}
