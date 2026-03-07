export type LogicOperator =
  | "AND"
  | "OR"
  | "ACCRUE"
  | "ALL"
  | "ANY"
  | "AT_LEAST"
  | "LOGSUM"
  | "WEIGHTED";
export type ImportanceLevel = "HIGH" | "NORMAL" | "LOW";
export type StructureScope = "SENTENCE" | "PARAGRAPH" | "DOCUMENT";
export type PositionRelationMode = "PROXIMITY" | "ORDER";
export type PositionRelationScope = "NEAR" | "SENTENCE" | "PARAGRAPH";
export type RuleField = "CONTENT" | "TITLE" | "COLUMN";

export interface UiRuleViewModel {
  root: UiExpressionNode | null;
}

export type UiExpressionNode =
  | UiLogicNode
  | UiStructureNode
  | UiPositionRelationNode
  | UiLegacyProximityNode
  | UiFieldNode
  | UiTermSetNode
  | UiNotNode
  | UiScoreNode
  | UiTopicRefNode;

export interface UiLogicNode {
  id: string;
  type: "LOGIC";
  operator: LogicOperator;
  threshold?: number;
  importance?: ImportanceLevel;
  importanceWeight?: number;
  weight?: number;
  children: UiExpressionNode[];
}

export interface UiStructureNode {
  id: string;
  type: "STRUCTURE";
  scope: StructureScope;
  child: UiExpressionNode | null;
}

export interface UiPositionRelationNode {
  id: string;
  type: "POSITION_RELATION";
  mode: PositionRelationMode;
  relation?: PositionRelationScope;
  distance?: number;
  ordered?: boolean;
  strict?: boolean;
  children: UiExpressionNode[];
}

// Backward-compatibility for legacy persisted trees.
export interface UiLegacyProximityNode {
  id: string;
  type: "PROXIMITY";
  relation: "NEAR" | "SENTENCE" | "PARAGRAPH" | "ORDER";
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
  weight?: number;
}

export interface UiTermSetNode {
  id: string;
  type: "TERM_SET";
  terms: UiTermExpression[];
  matchMode: "ANY" | "ALL";
  importance?: ImportanceLevel;
  importanceWeight?: number;
  weight?: number;
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

export type UiNodeType =
  | "LOGIC"
  | "STRUCTURE"
  | "POSITION_RELATION"
  | "PROXIMITY"
  | "FIELD"
  | "TERM_SET"
  | "NOT"
  | "SCORE"
  | "TOPIC_REF";

export interface UiSemanticCapability {
  allowModes: LogicOperator[];
  allowThreshold: boolean;
  allowWeighted: boolean;
  allowNested: boolean;
}

export interface UiStructureCapability {
  allowRelation: Array<"NONE" | "NEAR" | "SENTENCE" | "PARAGRAPH" | "ORDER">;
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
