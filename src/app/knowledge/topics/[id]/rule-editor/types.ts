export type LogicOperator = "AND" | "OR" | "ACCRUE" | "ALL" | "ANY";
export type ProximityRelation = "NEAR" | "SENTENCE" | "PARAGRAPH";
export type RuleField = "CONTENT" | "TITLE" | "COLUMN";

export interface UiRuleViewModel {
  root: UiExpressionNode | null;
}

export type UiExpressionNode =
  | UiLogicNode
  | UiProximityNode
  | UiFieldNode
  | UiTermSetNode
  | UiNotNode
  | UiScoreNode
  | UiTopicRefNode;

export interface UiLogicNode {
  id: string;
  type: "LOGIC";
  operator: LogicOperator;
  children: UiExpressionNode[];
}

export interface UiProximityNode {
  id: string;
  type: "PROXIMITY";
  relation: ProximityRelation;
  ordered: boolean;
  distance?: number;
  children: UiExpressionNode[];
}

export interface UiFieldNode {
  id: string;
  type: "FIELD";
  field: RuleField;
  child: UiExpressionNode | null;
}

export interface UiTermExpression {
  source: "CONCEPT";
  conceptId: string;
  conceptName: string;
  includeDescendants: boolean;
}

export interface UiTermSetNode {
  id: string;
  type: "TERM_SET";
  terms: UiTermExpression[];
  matchMode: "ANY" | "ALL";
}

export interface UiNotNode {
  id: string;
  type: "NOT";
  child: UiExpressionNode | null;
}

export interface UiScoreNode {
  id: string;
  type: "SCORE";
  weight: number;
  child: UiExpressionNode | null;
}

export interface UiTopicRefNode {
  id: string;
  type: "TOPIC_REF";
  topicId: string;
}

export type UiNodeType = UiExpressionNode["type"];

export interface UiSemanticCapability {
  allowModes: LogicOperator[];
  allowThreshold: boolean;
  allowWeighted: boolean;
  allowNested: boolean;
}

export interface UiStructureCapability {
  allowRelation: Array<"NONE" | ProximityRelation>;
  allowOrder: boolean;
  allowDistance: boolean;
}

export interface UiWhereCapability {
  allowFields: RuleField[];
  allowWhen: boolean;
}

export interface UiAdvancedCapability {
  allowTopicRef: boolean;
  allowExcludeGroup: boolean;
  allowScore: boolean;
  allowExplainOverride: boolean;
  allowNot?: boolean;
}

export interface UiCapabilityViewModel {
  semantic: UiSemanticCapability;
  structure: UiStructureCapability;
  where: UiWhereCapability;
  advanced: UiAdvancedCapability;
}

