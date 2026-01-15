export type GovernanceEventType =
  | "EXTRACTED"
  | "REQUEST_SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export const DECISION_EVENTS: GovernanceEventType[] = [
  "APPROVED",
  "REJECTED",
];

export const SYSTEM_EVENTS: GovernanceEventType[] = [
  "EXTRACTED",
  "REQUEST_SUBMITTED",
  "PUBLISHED",
  "ARCHIVED",
];
