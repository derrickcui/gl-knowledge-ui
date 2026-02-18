import { updateNode } from "./tree-utils";
import { createId } from "./utils";
import { normalizeExpressionTree } from "./expression-normalizer";
import type { UiExpressionNode } from "./types";
import type { ValidationIssue } from "./validation";

export function applyAutoFix(
  root: UiExpressionNode,
  issues: ValidationIssue[]
): { root: UiExpressionNode; fixed: boolean } {
  const errors = issues.filter((item) => item.severity === "error");
  if (errors.length === 0) return { root, fixed: false };

  // Prefer deterministic structural fixes first.
  const structureIssue = errors.find((item) => item.type === "STRUCTURE_UNDER_FIELD");
  if (structureIssue) {
    return {
      root: updateNode(root, structureIssue.nodeId, (node) =>
        node.type === "STRUCTURE"
          ? { id: createId(), type: "FIELD", field: "CONTENT", child: node }
          : node
      ),
      fixed: true,
    };
  }

  const modeIssue = errors.find((item) => item.type === "MODE_NEED_TWO_CHILDREN");
  if (modeIssue) {
    return {
      root: updateNode(root, modeIssue.nodeId, (node) =>
        node.type === "LOGIC" ? { ...node, operator: "ANY", threshold: undefined } : node
      ),
      fixed: true,
    };
  }

  const proximityTooMany = errors.find((item) => item.type === "PROXIMITY_MAX_TERMS");
  if (proximityTooMany) {
    return {
      root: updateNode(root, proximityTooMany.nodeId, (node) => {
        if (node.type === "POSITION_RELATION") return { ...node, children: node.children.slice(0, 5) };
        if (node.type === "PROXIMITY") return { ...node, children: node.children.slice(0, 5) };
        return node;
      }),
      fixed: true,
    };
  }

  const fieldConflict = errors.find((item) => item.type === "FIELD_CONFLICT" || item.type === "FIELD_NESTED");
  if (fieldConflict) {
    const normalized = normalizeExpressionTree(root);
    if (normalized.root) {
      return { root: normalized.root, fixed: true };
    }
  }

  return { root, fixed: false };
}
