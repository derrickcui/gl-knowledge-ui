export type AntiPatternSeverity = "INFO" | "WARNING" | "ERROR";

export interface AntiPatternFinding {
  severity: AntiPatternSeverity;
  code: string;
  message: string;
  path?: number[];
  suggestion?: string;
}

export interface AntiPatternReport {
  score: number;
  findings: AntiPatternFinding[];
}
