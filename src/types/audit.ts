export type AuditAction =
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "SUPERSEDED";

export interface AuditRecord {
  id: string;

  conceptId: string;
  conceptName: string;

  action: AuditAction;

  actor: string;
  actedAt: string; // ISO string

  reason?: string;

  version?: string;     // snapshot version
  snapshotId?: string;  // optional
}
