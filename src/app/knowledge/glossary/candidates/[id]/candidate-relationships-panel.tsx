import { CandidateRelationsResponse } from "@/lib/api";
import { t } from "@/i18n";

type RelationshipRow = {
  left: string;
  predicate: string;
  right: string;
  otherId: number;
  otherStatus: string;
};

function getStatusLabel(status: string) {
  if (status === "APPROVED") return t("glossary.status.approved");
  if (status === "PUBLISHED") return t("glossary.status.published");
  if (status === "CANDIDATE") return t("glossary.status.candidate");
  if (status === "ARCHIVED") return t("glossary.status.archived");
  return t("glossary.status.pending");
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
          {t("glossary.relationships.title")}
        </h2>
        <p className="text-sm opacity-70">
          {t("glossary.relationships.subtitle")}
        </p>
      </div>

      {outgoingRows.length || incomingRows.length ? (
        <div className="space-y-6 text-sm">
          <div className="space-y-3">
            <div className="font-medium">
              {t("glossary.relationships.outgoing")}
            </div>
            <div className="border-t" />
            {outgoingRows.length ? (
              <div className="space-y-2">
                {outgoingRows.map((row) =>
                  renderRow(row, "right")
                )}
              </div>
            ) : (
              <div className="text-sm opacity-60">
                {t("glossary.relationships.outgoingEmpty")}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="font-medium">
              {t("glossary.relationships.incoming")}
            </div>
            <div className="border-t" />
            {incomingRows.length ? (
              <div className="space-y-2">
                {incomingRows.map((row) =>
                  renderRow(row, "left")
                )}
              </div>
            ) : (
              <div className="text-sm opacity-60">
                {t("glossary.relationships.incomingEmpty")}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm opacity-70">
          {t("glossary.relationships.empty")}
        </div>
      )}

      <div className="text-xs opacity-70">
        {t("glossary.relationships.footer")}
      </div>
    </div>
  );
}
