import { AuditSnapshot } from "./auditTypes";

export async function saveAuditSnapshot(
  snapshot: AuditSnapshot
): Promise<void> {
  const res = await fetch("/api/audit/snapshots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) {
    throw new Error(`Failed to save audit snapshot: ${res.status}`);
  }
}

export async function loadAuditSnapshot(
  snapshotId: string
): Promise<AuditSnapshot> {
  const res = await fetch(`/api/audit/snapshots/${snapshotId}`);
  if (!res.ok) {
    throw new Error(`Failed to load audit snapshot: ${res.status}`);
  }
  return res.json();
}
