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
  if (status === "CANDIDATE") return "⚠ Candidate";
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

  function renderRow(row: RelationshipRow, linkSide: "left" | "right") {
    const otherLink =
      linkSide === "left" ? row.left : row.right;
    const otherLinkId = row.otherId;

    return (
      <div
        key={`${row.left}-${row.right}-${row.predicate}-${row.otherId}`}
        className="flex flex-wrap items-center gap-2"
      >
        {linkSide === "left" ? (
          <a
            href={`/knowledge/glossary/candidates/${otherLinkId}`}
            className="hover:underline"
          >
            {otherLink}
          </a>
        ) : (
          <span>{row.left}</span>
        )}
        <span className="font-mono text-xs opacity-70">
          -- {row.predicate} --&gt;
        </span>
        {linkSide === "right" ? (
          <a
            href={`/knowledge/glossary/candidates/${otherLinkId}`}
            className="hover:underline"
          >
            {otherLink}
          </a>
        ) : (
          <span>{row.right}</span>
        )}
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${getStatusClass(
            row.otherStatus
          )}`}
        >
          {getStatusLabel(row.otherStatus)}
        </span>
      </div>
    );
  }

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
        <div className="space-y-6 text-sm">
          <div className="space-y-3">
            <div className="font-medium">Outgoing</div>
            <div className="border-t" />
            {outgoingRows.length ? (
              <div className="space-y-2">
                {outgoingRows.map((row) =>
                  renderRow(row, "right")
                )}
              </div>
            ) : (
              <div className="text-sm opacity-60">None</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-medium">Incoming</div>
            <div className="border-t" />
            {incomingRows.length ? (
              <div className="space-y-2">
                {incomingRows.map((row) =>
                  renderRow(row, "left")
                )}
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
