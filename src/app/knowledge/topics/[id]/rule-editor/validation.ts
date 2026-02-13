import { t } from "@/i18n";
import type { UiCapabilityViewModel, UiExpressionNode } from "./types";

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
  const issues: ValidationIssue[] = [];
  visit(root, capability, issues);
  return issues;
}

function visit(node: UiExpressionNode, capability: UiCapabilityViewModel, issues: ValidationIssue[]) {
  if (node.type === "LOGIC") {
    if (node.children.length === 0) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.needAtLeastOneCondition"), severity: "warning" });
    }
    if (!capability.semantic.allowModes.includes(node.operator)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedMode"), severity: "error" });
    }
    node.children.forEach((child) => visit(child, capability, issues));
    return;
  }

  if (node.type === "PROXIMITY") {
    const wrappedLogic = node.children.length === 1 && node.children[0]?.type === "LOGIC";
    if (!wrappedLogic && node.children.length < 2) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.proximityNeedTwoTerms"), severity: "error" });
    }
    if (!capability.structure.allowRelation.includes(node.relation)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedRelation"), severity: "error" });
    }
    if (node.ordered && !capability.structure.allowOrder) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedOrder"), severity: "error" });
    }
    if (node.distance != null && !capability.structure.allowDistance) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedDistance"), severity: "error" });
    }
    node.children.forEach((child) => visit(child, capability, issues));
    return;
  }

  if (node.type === "FIELD") {
    if (!capability.where.allowFields.includes(node.field)) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedField"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.fieldIncomplete"), severity: "error" });
    } else {
      visit(node.child, capability, issues);
    }
    return;
  }

  if (node.type === "NOT") {
    if (!capability.advanced.allowNot) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedNot"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.notIncomplete"), severity: "error" });
    } else {
      visit(node.child, capability, issues);
    }
    return;
  }

  if (node.type === "SCORE") {
    if (!capability.advanced.allowScore) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedScore"), severity: "error" });
    }
    if (!node.child) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.scoreIncomplete"), severity: "error" });
    } else {
      visit(node.child, capability, issues);
    }
    return;
  }

  if (node.type === "TOPIC_REF") {
    if (!capability.advanced.allowTopicRef) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.unsupportedTopicRef"), severity: "error" });
    }
    if (!node.topicId.trim()) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.topicRefUnselected"), severity: "warning" });
    }
    return;
  }

  if (node.type === "TERM_SET") {
    if (node.terms.length === 0) {
      issues.push({ nodeId: node.id, message: t("ruleEditor.validation.needAtLeastOneTerm"), severity: "warning" });
    }
  }
}
