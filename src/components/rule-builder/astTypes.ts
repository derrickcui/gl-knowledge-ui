export type RuleType =
  | "GROUP"
  | "LOGIC"
  | "ACCUMULATE"
  | "PROXIMITY"
  | "CONCEPT_MATCH"
  | "TEXT_MATCH"
  | "FIELD_CONDITION"
  | "TOPIC_REF";

export interface RuleNode {
  id?: string;
  type: RuleType;
  params?: Record<string, any>;
  children?: RuleNode[];
  explain?: {
    mode: "AUTO" | "CUSTOM";
    text?: string;
  };
  priority?: number;
}

export function cloneRule<T>(rule: T): T {
  return JSON.parse(JSON.stringify(rule));
}

export function ensureChildren(node: RuleNode): RuleNode[] {
  if (!node.children) node.children = [];
  return node.children;
}
