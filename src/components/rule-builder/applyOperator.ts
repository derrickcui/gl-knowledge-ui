import { RuleNode, cloneRule } from "./astTypes";
import { addNode, getNodeByPath, setRoot, wrapNode } from "./astEditor";

export type RuleOperation = {
  node?: RuleNode;
  wrap?: (child: RuleNode) => RuleNode;
  root?: RuleNode;
};

export function applyOperator(
  root: RuleNode,
  activePath: number[],
  operation?: RuleOperation
): RuleNode {
  if (!operation) return root;
  const { node, wrap, root: newRoot } = operation;

  if (node) {
    return addNode(root, activePath, node);
  }

  if (wrap) {
    return wrapNode(root, activePath, wrap);
  }

  if (newRoot) {
    const target = getNodeByPath(root, activePath);
    if (target.type === "GROUP" && target.params?.role === "SCENARIO") {
      const draft = cloneRule(root);
      const nextTarget = getNodeByPath(draft, activePath);
      if (newRoot.type === "ACCUMULATE") {
        const mode = newRoot.params?.mode ?? "LOGSUM";
        const operator =
          mode === "LOGSUM" ? "LOGSUM" : mode === "ACCRUE" ? "ACCRUE" : "ACCRUE";
        nextTarget.params = {
          ...nextTarget.params,
          operator,
          mode: mode === "LOGSUM" ? undefined : mode,
          threshold:
            operator === "LOGSUM"
              ? newRoot.params?.threshold ?? nextTarget.params?.threshold ?? 2
              : undefined,
        };
        return draft;
      }
      nextTarget.params = {
        ...nextTarget.params,
        operator: newRoot.params?.operator ?? nextTarget.params?.operator,
      };
      return draft;
    }
    return setRoot(root, activePath, newRoot);
  }

  return root;
}
