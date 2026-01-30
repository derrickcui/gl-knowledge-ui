export type AuditSnapshot = {
  snapshotId: string;
  ruleId: string;
  ruleVersion: number;
  createdAt: string;
  createdBy: string;
  ruleExplain: string;
  groups: AuditGroupSnapshot[];
};

export type AuditGroupSnapshot = {
  groupId: string;
  priority: number;
  explainHeader: string;
  conditions: AuditConditionSnapshot[];
  matched: boolean;
};

export type AuditConditionSnapshot = {
  conditionId: string;
  explain: string;
  matched: boolean;
  evidence?: {
    docId: string;
    excerpt: string;
  }[];
};
