"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  fetchCandidates,
  CandidateDTO,
  CandidateListResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Pending Review",
  PENDING_REVIEW: "Pending Review",
  CANDIDATE: "Pending Review",
  SUBMITTED: "Under Review",
  IN_REVIEW: "Under Review",
  APPROVED: "Published",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING_REVIEW: "bg-gray-100 text-gray-700",
  CANDIDATE: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-700",
  PUBLISHED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function getStatusClass(status: string) {
  return STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700";
}

function isEditableStatus(status: string) {
  return (
    status === "CANDIDATE" ||
    status === "DRAFT" ||
    status === "PENDING_REVIEW"
  );
}

const ALL_CANDIDATES = "ALL";
const PAGE_SIZE = 10;

export function CandidatesView({
  initialStatus,
  initialData,
}: {
  initialStatus: string;
  initialData: CandidateListResponse;
}) {
  const router = useRouter(); // ƒ-? †.3‚"r 1
  const [status, setStatus] = useState(initialStatus);
  const [rows, setRows] = useState<CandidateDTO[]>(
    initialData.items
  );
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [nextCursor, setNextCursor] = useState<number | null>(
    initialData.nextCursor ?? null
  );
  const [query, setQuery] = useState("");

  function getStatusForFetch(value: string) {
    return value === ALL_CANDIDATES ? "CANDIDATE" : value;
  }

  async function reload(
    nextStatus: string,
    nextOffset = 0,
    nextQuery = query
  ) {
    setLoading(true);
    try {
      const data = await fetchCandidates({
        status: getStatusForFetch(nextStatus),
        limit: PAGE_SIZE,
        offset: nextOffset,
        query: nextQuery || undefined,
      });
      setRows(data.items);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor ?? null);
      setOffset(nextOffset);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Candidates</h1>
        <p className="text-sm opacity-70">
          Review glossary candidates and their current status.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            reload(v, 0);
          }}
        >
          <option value={ALL_CANDIDATES}>All Candidates</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="IN_REVIEW">Under Review</option>
        </select>

        <div className="flex items-center gap-2">
          <input
            type="text"
            className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
            placeholder="Search candidates"
            value={query}
            onChange={(e) => {
              const nextQuery = e.target.value;
              setQuery(nextQuery);
              reload(status, 0, nextQuery);
            }}
          />
          {query && (
            <button
              type="button"
              className="h-9 rounded-md border px-3 text-sm"
              onClick={() => {
                setQuery("");
                reload(status, 0, "");
              }}
            >
              Clear
            </button>
          )}
        </div>

        {loading && (
          <span className="text-sm opacity-60">Loadingƒ?Ý</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
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
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const displayStatus =
                r.lifecycleStatus ?? r.status;
              const isInReview =
                displayStatus === "IN_REVIEW" ||
                displayStatus === "SUBMITTED";
              const editable =
                isEditableStatus(displayStatus);
              const statusLabel =
                getStatusLabel(displayStatus);
              const statusClass =
                getStatusClass(displayStatus);
              const statusTooltip = isInReview
                ? "Under Review\n- High frequency across documents\n- Requires human validation"
                : undefined;

              return (
                <tr
                  key={r.id}
                  className={`hover:bg-muted/60 ${
                    editable ? "cursor-pointer" : "cursor-default"
                  }`}
                  onClick={
                    editable
                      ? () => {
                          // ƒ-? †.3‚"r 2‹¬s‡oY‘-œ‡s,Šú3Š«ª‚?¯Š_`
                          router.push(
                            `/knowledge/glossary/candidates/${r.id}`
                          );
                        }
                      : undefined
                  }
                >
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
                      title={statusTooltip}
                    >
                      {statusLabel}
                    </span>
                    {!editable && (
                      <button
                        type="button"
                        className="ml-2 text-xs text-muted-foreground hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/knowledge/glossary/candidates/${r.id}`
                          );
                        }}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-sm opacity-60"
                >
                  No candidates found
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
              reload(status, Math.max(0, offset - PAGE_SIZE))
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
              reload(status, nextOffset);
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
