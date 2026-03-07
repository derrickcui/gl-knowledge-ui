"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

import type { AuditRecord } from "@/types/audit";
import {
  CandidateDTO,
  CandidateRelationsResponse,
  fetchCandidateById,
  fetchCandidateRelations,
  fetchCandidateSnapshot,
  fetchCandidateSnapshotRelations,
} from "@/lib/api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { t } from "@/i18n";

export function AuditDrawer({
  open,
  record,
  mode,
  onClose,
}: {
  open: boolean;
  record: AuditRecord | null;
  mode: "snapshot" | "current";
  onClose: () => void;
}) {
  const [loadingMessage, setLoadingMessage] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<
    CandidateDTO | null
  >(null);
  const [relations, setRelations] = useState<
    CandidateRelationsResponse | null
  >(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !record) return;
    let ignore = false;
    const currentRecord = record;

    async function load() {
      setCandidate(null);
      setRelations(null);
      setError(null);

      const isSnapshot = mode === "snapshot";
      if (isSnapshot && !currentRecord.snapshotId) {
        setError(t("glossary.audit.snapshotUnavailable"));
        return;
      }

      setLoadingMessage(
        t("glossary.common.processing", {
          action: isSnapshot
            ? t("glossary.common.action.loadSnapshot")
            : t("glossary.common.action.loadCurrent"),
        })
      );
      const candidateId = Number(currentRecord.conceptId);
      const snapshotId = currentRecord.snapshotId ?? "";

      const [candidateRes, relationRes] = isSnapshot
        ? await Promise.all([
            fetchCandidateSnapshot(candidateId, snapshotId),
            fetchCandidateSnapshotRelations(candidateId, snapshotId),
          ])
        : await Promise.all([
            fetchCandidateById(candidateId),
            fetchCandidateRelations(candidateId),
          ]);

      if (!ignore) {
        if (candidateRes.data) {
          setCandidate(candidateRes.data);
        } else {
          setError(
            candidateRes.error ?? t("glossary.common.loadFailed")
          );
        }

        if (relationRes.data) {
          setRelations(relationRes.data);
        } else if (!candidateRes.error) {
          setError(
            relationRes.error ?? t("glossary.audit.relationsLoadFailed")
          );
        }
        setLoadingMessage(null);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [open, record, mode]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        className={clsx(
          "absolute right-0 top-0 h-full w-[520px]",
          "bg-background shadow-xl",
          "flex flex-col"
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-medium">
              {record.conceptName}
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === "snapshot"
                ? t("glossary.audit.viewingSnapshot")
                : t("glossary.audit.viewingCurrent")}
              {record.version ? ` ?? ${record.version}` : ""}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
            aria-label={t("glossary.common.close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 text-sm">
          {loadingMessage && (
            <FeedbackBanner type="info" title={loadingMessage} />
          )}
          {error && (
            <div className="mt-3">
              <FeedbackBanner type="error" title={error} />
            </div>
          )}
          {candidate && (
            <SnapshotContent
              record={record}
              candidate={candidate}
              relations={relations}
            />
          )}
        </div>

        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          {t("glossary.audit.snapshotFooter")}
        </div>
      </div>
    </div>
  );
}

function SnapshotContent({
  record,
  candidate,
  relations,
}: {
  record: AuditRecord;
  candidate: CandidateDTO;
  relations: CandidateRelationsResponse | null;
}) {
  const lifecycleStatus =
    candidate.lifecycleStatus ?? candidate.status;
  const relationSummary = relations?.outgoing && relations?.incoming
    ? t("glossary.audit.relationsSummary", {
        outgoing: relations.outgoing.length,
        incoming: relations.incoming.length,
      })
    : t("glossary.audit.relationsEmpty");

  return (
    <div className="space-y-4">
      <section>
        <div className="font-medium">{t("glossary.audit.term")}</div>
        <div className="text-muted-foreground">
          {candidate.canonical}
        </div>
      </section>

      <section>
        <div className="font-medium">{t("glossary.audit.action")}</div>
        <div className="text-muted-foreground">
          {record.action}
        </div>
      </section>

      <section>
        <div className="font-medium">{t("glossary.audit.actor")}</div>
        <div className="text-muted-foreground">
          {record.actor}
        </div>
      </section>

      <section>
        <div className="font-medium">{t("glossary.audit.time")}</div>
        <div className="text-muted-foreground">
          {new Date(record.actedAt).toLocaleString()}
        </div>
      </section>

      {record.reason && (
        <section>
          <div className="font-medium">{t("glossary.audit.reason")}</div>
          <div className="text-muted-foreground">
            {record.reason}
          </div>
        </section>
      )}

      {record.version && (
        <section>
          <div className="font-medium">{t("glossary.audit.snapshotVersion")}</div>
          <div className="text-muted-foreground">
            {record.version}
          </div>
        </section>
      )}

      <section>
        <div className="font-medium">{t("glossary.audit.lifecycle")}</div>
        <div className="text-muted-foreground">
          {lifecycleStatus}
        </div>
      </section>

      {candidate.definition && (
        <section>
          <div className="font-medium">{t("glossary.audit.definition")}</div>
          <div className="text-muted-foreground">
            {candidate.definition}
          </div>
        </section>
      )}

      {candidate.aliases?.length ? (
        <section>
          <div className="font-medium">{t("glossary.audit.aliases")}</div>
          <div className="text-muted-foreground">
            {candidate.aliases.join(", ")}
          </div>
        </section>
      ) : null}

      <section>
        <div className="font-medium">{t("glossary.audit.relations")}</div>
        <div className="text-muted-foreground">
          {relationSummary}
        </div>
      </section>
    </div>
  );
}
