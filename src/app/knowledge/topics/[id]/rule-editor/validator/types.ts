export interface ValidationError {
  nodeId: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

