export interface ChecklistSummary {
  explain: {
    added: number;
    modified: number;
    removed: number;
  };
  antiPattern: {
    errors: number;
    warnings: number;
    infos: number;
  };
  decision: {
    canApprove: boolean;
    reason?: string;
  };
}
