import { operatorToAst } from "../rule-palette/paletteToAst";
import { BusinessOperatorId } from "../rule-palette/paletteDefinition";
import { RuleNode } from "./astTypes";
import { addNode, getNodeByPath, setRoot, wrapNode } from "./astEditor";
import { isDuplicateWrap } from "./operatorGuards";

export function applyOperator(
  root: RuleNode,
  activePath: number[],
  operatorId: BusinessOperatorId,
  payload?: any
): RuleNode {
  const { node, wrap, root: newRoot } = operatorToAst(operatorId, payload);

  if (node) {
    return addNode(root, activePath, node);
  }

  if (wrap) {
    const target = getNodeByPath(root, activePath);
    if (isDuplicateWrap(operatorId, target)) {
      return root;
    }
    return wrapNode(root, activePath, wrap);
  }

  if (newRoot) {
    return setRoot(root, activePath, newRoot);
  }

  return root;
}
