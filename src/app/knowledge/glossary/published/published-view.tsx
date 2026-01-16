"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  fetchCandidates,
  fetchCandidateRelations,
  CandidateRelationsResponse,
  fetchCandidateById,
  publishCandidate,
  publishCandidates,
  CandidateDTO,
  CandidateListResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function getStatusClass(status: string) {
  return STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
}

function normalizeStatus(status: string) {
  return status.trim().toUpperCase();
}

const PAGE_SIZE = 10;

type DependencyRow = {
  direction: "outgoing" | "incoming";
  left: string;
  predicate: string;
  right: string;
  status: string;
};

type DependencySummary = {
  hasPending: boolean;
  rows: DependencyRow[];
};

function isApprovedStatus(status: string) {
  const normalized = normalizeStatus(status);
  return normalized === "APPROVED" || normalized === "PUBLISHED";
}

export function PublishedView({
  initialData,
}: {
  initialData: CandidateListResponse;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CandidateDTO[]>(
    initialData.items
  );
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [nextCursor, setNextCursor] = useState<number | null>(
    initialData.nextCursor ?? null
  );
  const [dependencyMap, setDependencyMap] = useState<
    Record<number, DependencySummary>
  >({});
  const [dependencyOpen, setDependencyOpen] = useState(false);
  const [dependencyTitle, setDependencyTitle] = useState("");
  const [dependencyRows, setDependencyRows] = useState<
    DependencyRow[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<number[]>(
    []
  );
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState<null | {
    type: "error" | "success";
    title: string;
    message?: string;
  }>(null);

  const candidateNames = useMemo(() => {
    const map: Record<number, string> = {};
    rows.forEach((item) => {
      map[item.id] = item.canonical;
    });
    return map;
  }, [rows]);

  async function reload(nextOffset = 0) {
    setLoading(true);
    try {
      const data = await fetchCandidates({
        status: "APPROVED",
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setRows(data.items);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor ?? null);
      setOffset(nextOffset);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadDependencies() {
      const updates: Record<number, DependencySummary> = {};
      await Promise.all(
        rows.map(async (row) => {
          try {
            const relations = await fetchCandidateRelations(
              row.id
            );
            const relationRows = await buildRelationRows(
              row.canonical,
              relations
            );
            updates[row.id] = {
              hasPending: relationRows.some(
                (entry) => !isApprovedStatus(entry.status)
              ),
              rows: relationRows,
            };
          } catch {
            updates[row.id] = {
              hasPending: false,
              rows: [],
            };
          }
        })
      );

      if (!ignore) {
        setDependencyMap((prev) => ({ ...prev, ...updates }));
      }
    }

    if (rows.length) {
      loadDependencies();
    }

    return () => {
      ignore = true;
    };
  }, [rows]);

  async function buildRelationRows(
    candidateName: string,
    relations: CandidateRelationsResponse
  ): Promise<DependencyRow[]> {
    const relationRows: DependencyRow[] = [];
    const statusCache = new Map<number, string>();

    async function resolveStatus(
      id: number,
      fallback: string
    ) {
      if (statusCache.has(id)) {
        return statusCache.get(id) as string;
      }
      try {
        const candidate = await fetchCandidateById(id);
        const resolved =
          candidate.lifecycleStatus ?? candidate.status;
        statusCache.set(id, resolved);
        return resolved;
      } catch {
        statusCache.set(id, fallback);
        return fallback;
      }
    }

    for (const item of relations.outgoing) {
      const resolvedStatus = normalizeStatus(
        await resolveStatus(
          item.target.id,
          item.target.status
        )
      );
      relationRows.push({
        direction: "outgoing",
        left: candidateName,
        predicate: item.predicate,
        right: item.target.name,
        status: resolvedStatus,
      });
    }

    for (const item of relations.incoming) {
      const resolvedStatus = normalizeStatus(
        await resolveStatus(
          item.source.id,
          item.source.status
        )
      );
      relationRows.push({
        direction: "incoming",
        left: item.source.name,
        predicate: item.predicate,
        right: candidateName,
        status: resolvedStatus,
      });
    }

    return relationRows;
  }

  function openDependencies(candidateId: number) {
    const summary = dependencyMap[candidateId];
    const title = candidateNames[candidateId] ?? "Dependencies";
    setDependencyTitle(title);
    setDependencyRows(summary?.rows ?? []);
    setDependencyOpen(true);
  }

  const allSelected =
    rows.length > 0 && selectedIds.length === rows.length;

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(rows.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  }

  function toggleRow(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  }

  async function handlePublish() {
    if (!selectedIds.length) return;
    setPublishing(true);
    try {
      if (selectedIds.length === 1) {
        await publishCandidate(selectedIds[0]);
      } else {
        await publishCandidates(selectedIds);
      }
      setFeedback({
        type: "success",
        title: "Published",
        message: "Selected candidates have been published.",
      });
      await reload(offset);
    } catch (error: any) {
      setFeedback({
        type: "error",
        title: "Publish failed",
        message: error?.message ?? "Unable to publish candidates.",
      });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Published</h1>
          <p className="text-sm opacity-70">
            Terms that are active and available to downstream use.
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-50"
          disabled={!selectedIds.length || publishing}
          onClick={handlePublish}
        >
          Publish
        </button>
      </div>

      {loading && (
        <span className="text-sm opacity-60">Loading...</span>
      )}

      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b px-3 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) =>
                    toggleSelectAll(event.target.checked)
                  }
                />
              </th>
              <th className="border-b px-3 py-2 text-left">
                Canonical
              </th>
              <th className="border-b px-3 py-2 text-left">
                Role
              </th>
              <th className="border-b px-3 py-2 text-left">
                Confidence
              </th>
              <th className="border-b px-3 py-2 text-left">
                Status
              </th>
              <th className="border-b px-3 py-2 text-left">
                Dependencies
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const displayStatus =
                r.lifecycleStatus ?? r.status;
              const statusLabel =
                getStatusLabel(displayStatus);
              const statusClass =
                getStatusClass(displayStatus);

              return (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/60"
                  onClick={() => {
                    router.push(
                      `/knowledge/glossary/candidates/${r.id}`
                    );
                  }}
                >
                  <td
                    className="border-b px-3 py-2"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(event) =>
                        toggleRow(r.id, event.target.checked)
                      }
                    />
                  </td>
                  <td className="border-b px-3 py-2">
                    {r.canonical}
                  </td>

                  <td className="border-b px-3 py-2">
                    <Badge variant={r.role as any}>
                      {r.role}
                    </Badge>
                  </td>

                  <td className="border-b px-3 py-2">
                    <ConfidenceLabel value={r.confidence} />
                  </td>

                  <td className="border-b px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    {dependencyMap[r.id]?.hasPending ? (
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs text-amber-800"
                        title="View pending dependencies"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDependencies(r.id);
                        }}
                      >
                        !
                      </button>
                    ) : (
                      <span className="text-xs opacity-50">-</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-sm opacity-60"
                >
                  No published candidates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">
          Page {Math.floor(offset / PAGE_SIZE) + 1}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-40"
            disabled={loading || offset === 0}
            onClick={() =>
              reload(Math.max(0, offset - PAGE_SIZE))
            }
          >
            Previous
          </button>
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-40"
            disabled={loading || !hasMore}
            onClick={() => {
              const nextOffset =
                nextCursor ?? offset + PAGE_SIZE;
              reload(nextOffset);
            }}
          >
            Next
          </button>
        </div>
      </div>

      <DependencyDialog
        open={dependencyOpen}
        title={dependencyTitle}
        rows={dependencyRows}
        onClose={() => setDependencyOpen(false)}
      />
    </div>
  );
}

function DependencyDialog({
  open,
  title,
  rows,
  onClose,
}: {
  open: boolean;
  title: string;
  rows: DependencyRow[];
  onClose: () => void;
}) {
  if (!open) return null;

  function formatDependencyStatus(status: string) {
    const normalized = normalizeStatus(status);
    if (normalized === "APPROVED") return "Approved";
    if (normalized === "PUBLISHED") return "Published";
    if (normalized === "ARCHIVED") return "Archived";
    if (normalized === "CANDIDATE") return "Candidate";
    if (normalized === "IN_REVIEW") return "In Review";
    if (normalized === "SUBMITTED") return "In Review";
    return "Pending";
  }

  const outgoingRows = rows.filter(
    (row) => row.direction === "outgoing"
  );
  const incomingRows = rows.filter(
    (row) => row.direction === "incoming"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-lg bg-white p-6 shadow-xl">
        <div className="text-base font-semibold">
          Dependencies for {title}
        </div>
        <p className="mt-2 text-sm opacity-70">
          These relationships cannot activate until the other side is approved.
        </p>

        <div className="mt-4 space-y-4 text-sm">
          {rows.length ? (
            <>
              <div className="space-y-2">
                <div className="font-medium">Outgoing</div>
                <div className="border-t" />
                {outgoingRows.length ? (
                  outgoingRows.map((row, index) => (
                    <div
                      key={`outgoing-${row.left}-${row.right}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span>{row.left}</span>
                      <span className="font-mono text-xs opacity-70">
                        -- {row.predicate} --&gt;
                      </span>
                      <span>{row.right}</span>
                      <span className="text-xs">
                        {formatDependencyStatus(row.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm opacity-60">None</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-medium">Incoming</div>
                <div className="border-t" />
                {incomingRows.length ? (
                  incomingRows.map((row, index) => (
                    <div
                      key={`incoming-${row.left}-${row.right}-${index}`}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span>{row.left}</span>
                      <span className="font-mono text-xs opacity-70">
                        -- {row.predicate} --&gt;
                      </span>
                      <span>{row.right}</span>
                      <span className="text-xs">
                        {formatDependencyStatus(row.status)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm opacity-60">None</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm opacity-60">
              No relationships found.
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
