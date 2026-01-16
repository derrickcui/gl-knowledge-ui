import { CandidateRelationsResponse } from "@/lib/api";

type RelationshipRow = {
  left: string;
  predicate: string;
  right: string;
  otherId: number;
  otherStatus: string;
};

function getStatusLabel(status: string) {
  if (status === "APPROVED") return "✔ Approved";
  if (status === "PUBLISHED") return "✔ Published";
  if (status === "ARCHIVED") return "✖ Archived";
  return "⚠ Pending";
}

function getStatusClass(status: string) {
  if (status === "APPROVED" || status === "PUBLISHED") {
    return "text-green-700 bg-green-100";
  }
  if (status === "ARCHIVED") {
    return "text-red-700 bg-red-100";
  }
  return "text-amber-800 bg-amber-100";
}

export function CandidateRelationshipsPanel({
  candidateName,
  relations,
}: {
  candidateName: string;
  relations: CandidateRelationsResponse;
}) {
  const outgoingRows: RelationshipRow[] = relations.outgoing.map(
    (item) => ({
      left: candidateName,
      predicate: item.predicate,
      right: item.target.name,
      otherId: item.target.id,
      otherStatus: item.target.status,
    })
  );

  const incomingRows: RelationshipRow[] = relations.incoming.map(
    (item) => ({
      left: item.source.name,
      predicate: item.predicate,
      right: candidateName,
      otherId: item.source.id,
      otherStatus: item.source.status,
    })
  );

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div className="space-y-1">
        <h2 className="font-medium">
          Relationships (Impact Preview)
        </h2>
        <p className="text-sm opacity-70">
          Relationships that will be affected if this candidate is approved.
        </p>
      </div>

      {outgoingRows.length || incomingRows.length ? (
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide opacity-70">
              我关联了谁 (Outgoing)
            </div>
            {outgoingRows.length ? (
              <div className="space-y-2">
                {outgoingRows.map((row, index) => (
                  <div
                    key={`outgoing-${row.left}-${row.right}-${index}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <span>{row.left}</span>
                    <span className="font-medium">{row.predicate}</span>
                    <a
                      href={`/knowledge/glossary/candidates/${row.otherId}`}
                      className="hover:underline"
                    >
                      {row.right}
                    </a>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${getStatusClass(
                        row.otherStatus
                      )}`}
                    >
                      {getStatusLabel(row.otherStatus)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-60">None</div>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide opacity-70">
              谁关联了我 (Incoming)
            </div>
            {incomingRows.length ? (
              <div className="space-y-2">
                {incomingRows.map((row, index) => (
                  <div
                    key={`incoming-${row.left}-${row.right}-${index}`}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <a
                      href={`/knowledge/glossary/candidates/${row.otherId}`}
                      className="hover:underline"
                    >
                      {row.left}
                    </a>
                    <span className="font-medium">{row.predicate}</span>
                    <span>{row.right}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${getStatusClass(
                        row.otherStatus
                      )}`}
                    >
                      {getStatusLabel(row.otherStatus)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm opacity-60">None</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm opacity-70">
          No relationships found.
        </div>
      )}

      <div className="text-xs opacity-70">
        Relationships will not be activated until both concepts are published.
      </div>
    </div>
  );
}
