export type ReviewErrorCode =
  | "RULE_QUALITY_BLOCKED"
  | "INVALID_REVIEW_STATE"
  | "CONCURRENT_MODIFICATION"
  | "RULE_VALIDATION_FAILED"
  | "UNKNOWN";

export interface ReviewActionError {
  status: number;
  code: ReviewErrorCode;
  message?: string;
  details?: any;
}
