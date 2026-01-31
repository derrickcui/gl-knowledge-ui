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
  importance?: {
    scenarios: {
      title: string;
      counts: {
        high: number;
        normal: number;
        low: number;
      };
    }[];
  };
}
