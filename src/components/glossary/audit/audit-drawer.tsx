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

/**
 * AuditDrawer
 * - 只读
 * - 展示某一次 Audit Record 对应的 Concept Snapshot
 * - 不负责 fetch 列表，只 fetch snapshot
 */
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
  // 关闭时禁止 body 滚动（基础处理）
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

    async function load() {
      setCandidate(null);
      setRelations(null);
      setError(null);

      const isSnapshot = mode === "snapshot";
      if (isSnapshot && !record.snapshotId) {
        setError("No snapshot available for this record.");
        return;
      }

      setLoadingMessage(
        `正在执行加载${isSnapshot ? "快照" : "当前"}数据操作，请稍后...`
      );
      const candidateId = Number(record.conceptId);
      const snapshotId = record.snapshotId ?? "";

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
          setError(candidateRes.error ?? "Failed to load data.");
        }

        if (relationRes.data) {
          setRelations(relationRes.data);
        } else if (!candidateRes.error) {
          setError(relationRes.error ?? "Failed to load relations.");
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
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* drawer */}
      <div
        className={clsx(
          "absolute right-0 top-0 h-full w-[520px]",
          "bg-background shadow-xl",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-medium">
              {record.conceptName}
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === "snapshot"
                ? "Viewing historical snapshot"
                : "Viewing current data"}
              {record.version ? ` · ${record.version}` : ""}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
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

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Audit snapshots are read-only and immutable.
        </div>
      </div>
    </div>
  );
}

/**
 * SnapshotContent
 * ⚠️ v1：只展示 audit record 自带的信息
 * v2：这里可以 fetch `/concepts/{id}/snapshots/{version}`
 */
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
  return (
    <div className="space-y-4">
      <section>
        <div className="font-medium">Term</div>
        <div className="text-muted-foreground">
          {candidate.canonical}
        </div>
      </section>

      <section>
        <div className="font-medium">Action</div>
        <div className="text-muted-foreground">
          {record.action}
        </div>
      </section>

      <section>
        <div className="font-medium">Actor</div>
        <div className="text-muted-foreground">
          {record.actor}
        </div>
      </section>

      <section>
        <div className="font-medium">Time</div>
        <div className="text-muted-foreground">
          {new Date(record.actedAt).toLocaleString()}
        </div>
      </section>

      {record.reason && (
        <section>
          <div className="font-medium">Reason</div>
          <div className="text-muted-foreground">
            {record.reason}
          </div>
        </section>
      )}

      {record.version && (
        <section>
          <div className="font-medium">Snapshot Version</div>
          <div className="text-muted-foreground">
            {record.version}
          </div>
        </section>
      )}

      <section>
        <div className="font-medium">Lifecycle</div>
        <div className="text-muted-foreground">
          {lifecycleStatus}
        </div>
      </section>

      {candidate.definition && (
        <section>
          <div className="font-medium">Definition</div>
          <div className="text-muted-foreground">
            {candidate.definition}
          </div>
        </section>
      )}

      {candidate.aliases?.length ? (
        <section>
          <div className="font-medium">Aliases</div>
          <div className="text-muted-foreground">
            {candidate.aliases.join(", ")}
          </div>
        </section>
      ) : null}

      <section>
        <div className="font-medium">Relations</div>
        <div className="text-muted-foreground">
          {relations?.outgoing && relations?.incoming
            ? `${relations.outgoing.length} outgoing, ${relations.incoming.length} incoming`
            : "No relations loaded"}
        </div>
      </section>
    </div>
  );
}
