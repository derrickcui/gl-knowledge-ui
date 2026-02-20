export type ReviewDecision = "APPROVE" | "REJECT" | "";

export type SemanticItem = {
  id: string;
  text: string;
};

export type ReviewViewMode = "semantic" | "logic" | "governance";

export type ExplainTreeNode = {
  id?: string;
  type?: string | null;
  operator?: string | null;
  text?: string | null;
  children?: ExplainTreeNode[] | null;
};

export type LogicNode = {
  id: string;
  kind: "GROUP" | "TERM";
  label: string;
  children: LogicNode[];
  semanticRefId?: string | null;
};

export type ComplexityMetrics = {
  logicDepth: number;
  conditionCount: number;
  orCount: number;
  excludeCount: number;
  hasRangeConstraint: boolean;
  score: number;
  level: "低" | "中" | "高";
  health: "优" | "良" | "需关注";
};

export type RiskFinding = {
  id: string;
  text: string;
  scoreImpact: number;
  targetNodeId?: string | null;
};

export type RiskSummary = {
  score: number;
  level: "低风险" | "中风险" | "高风险";
  findings: RiskFinding[];
};

export type TemplateCheckItem = {
  id: string;
  passed: boolean;
  text: string;
};

export type HistoryRecord = {
  revision: number;
  fromRevision?: number;
  actor: string;
  time?: string | null;
  summary: string;
};
