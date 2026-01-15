import { GovernanceEventType } from "./event-types";

export interface GovernanceEvent {
  id: number;

  candidateId: number;
  changeId?: number | null;

  type: GovernanceEventType;

  operator: string;        // system / username
  timestamp: string;       // ISO string

  reason?: string | null;  // ONLY for decision events
}
