export interface EvidenceRef {
  path: number[];
  label?: string;
}

export interface ExplainBlock {
  level: "INFO" | "WARNING" | "ERROR";
  title: string;
  lines: string[];
  evidence?: EvidenceRef[];
}
