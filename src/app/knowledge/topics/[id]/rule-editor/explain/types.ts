import type { UiExpressionNode } from "../types";

export type ExplainNodeType =
  | "FIELD"
  | "STRUCTURE"
  | "LOGIC"
  | "POSITION"
  | "TERM";

export interface ExplainNode {
  type: ExplainNodeType;
  text: string;
  source: UiExpressionNode;
  children: ExplainNode[];
}
