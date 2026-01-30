import { operatorToAst } from "@/components/rule-palette/paletteToAst";
import { BusinessOperatorId } from "@/components/rule-palette/paletteDefinition";
import { RuleOperation } from "./applyOperator";
import { createNodeId } from "./nodeId";

export function compileOperator(
  operatorId: BusinessOperatorId,
  payload?: any
): RuleOperation {
  const op = operatorToAst(operatorId, payload);
  if (op.node && !op.node.id) {
    op.node.id = createNodeId();
  }
  return op;
}
