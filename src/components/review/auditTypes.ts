export interface AuditEvent {
  id: number;
  action: string;
  actor: string;
  actorType?: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  createdAt: string;
}
