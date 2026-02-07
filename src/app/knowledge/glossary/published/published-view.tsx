"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import cytoscape from "cytoscape";

import {
  fetchCandidates,
  fetchCandidateRelations,
  CandidateRelationsResponse,
  fetchCandidateById,
  publishCandidate,
  publishCandidates,
  fetchConceptGraph,
  ConceptGraphResponse,
  CandidateDTO,
  CandidateListResponse,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { t } from "@/i18n";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

function getStatusLabel(status: string) {
  switch (normalizeStatus(status)) {
    case "APPROVED":
      return t("glossary.status.approved");
    case "PUBLISHED":
      return t("glossary.status.published");
    case "ARCHIVED":
      return t("glossary.status.archived");
    default:
      return status;
  }
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
  mode,
}: {
  initialData: CandidateListResponse;
  mode: "publish" | "knowbase";
}) {
  const router = useRouter();
  const isPublishMode = mode === "publish";
  const fetchStatus = isPublishMode ? "APPROVED" : "PUBLISHED";
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
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  }>(null);
  const [statusMessage, setStatusMessage] = useState<
    string | null
  >(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(
    null
  );
  const [graphData, setGraphData] =
    useState<ConceptGraphResponse | null>(null);
  const [graphDepth, setGraphDepth] = useState(1);
  const [graphMaxNodes, setGraphMaxNodes] = useState(20);
  const graphContainerRef = useRef<HTMLDivElement | null>(
    null
  );

  const candidateNames = useMemo(() => {
    const map: Record<number, string> = {};
    rows.forEach((item) => {
      map[item.id] = item.canonical;
    });
    return map;
  }, [rows]);

  async function reload(
    nextOffset = 0,
    actionLabel = t("glossary.common.action.load"),
    nextQuery = query
  ) {
    setStatusMessage(
      t("glossary.common.processing", { action: actionLabel })
    );
    setLoading(true);
    try {
      const result = await fetchCandidates({
        status: fetchStatus,
        limit: PAGE_SIZE,
        offset: nextOffset,
        query: nextQuery || undefined,
      });
      if (result.data) {
        setRows(result.data.items);
        setHasMore(result.data.hasMore);
        setNextCursor(result.data.nextCursor ?? null);
        setOffset(nextOffset);
        if (isPublishMode) {
          setSelectedIds([]);
        }
      }
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadDependencies() {
      const updates: Record<number, DependencySummary> = {};
      setStatusMessage(
        t("glossary.common.processing", {
          action: t("glossary.common.action.loadDependencies"),
        })
      );
      try {
        await Promise.all(
          rows.map(async (row) => {
            const result = await fetchCandidateRelations(
              row.id
            );
            if (result.data) {
              const relationRows = await buildRelationRows(
                row.canonical,
                result.data
              );
              updates[row.id] = {
                hasPending: relationRows.some(
                  (entry) =>
                    !isApprovedStatus(entry.status)
                ),
                rows: relationRows,
              };
            } else {
              updates[row.id] = {
                hasPending: false,
                rows: [],
              };
            }
          })
        );
      } finally {
        setStatusMessage(null);
      }

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
      const result = await fetchCandidateById(id);
      if (result.data) {
        const resolved =
          result.data.lifecycleStatus ?? result.data.status;
        statusCache.set(id, resolved);
        return resolved;
      }
      statusCache.set(id, fallback);
      return fallback;
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
    const title =
      candidateNames[candidateId] ??
      t("glossary.dependencies.titleFallback");
    setDependencyTitle(title);
    setDependencyRows(summary?.rows ?? []);
    setDependencyOpen(true);
  }

  async function openGraph(candidateId: number) {
    setGraphOpen(true);
    setGraphLoading(true);
    setGraphError(null);
    setGraphDepth(1);
    setGraphMaxNodes(20);
    setStatusMessage(
      t("glossary.common.processing", {
        action: t("glossary.common.action.loadGraph"),
      })
    );
    try {
      const result = await fetchConceptGraph({
        id: candidateId,
        depth: 1,
        maxNodes: 20,
        includeIncoming: true,
        includeOutgoing: true,
      });
      if (result.data) {
        setGraphData(result.data);
      } else {
        setGraphError(
          result.error ?? t("glossary.graph.loadFailed")
        );
      }
    } finally {
      setGraphLoading(false);
      setStatusMessage(null);
    }
  }

  async function expandGraph() {
    if (!graphData) return;
    const nextDepth = graphDepth + 1;
    const nextMaxNodes = graphMaxNodes + 20;
    setGraphLoading(true);
    setGraphError(null);
    setStatusMessage(
      t("glossary.common.processing", {
        action: t("glossary.common.action.expandGraph"),
      })
    );
    try {
      const result = await fetchConceptGraph({
        id: graphData.center.id,
        depth: nextDepth,
        maxNodes: nextMaxNodes,
        includeIncoming: true,
        includeOutgoing: true,
      });
      if (result.data) {
        setGraphData(result.data);
        setGraphDepth(nextDepth);
        setGraphMaxNodes(nextMaxNodes);
      } else {
        setGraphError(
          result.error ?? t("glossary.graph.loadFailed")
        );
      }
    } finally {
      setGraphLoading(false);
      setStatusMessage(null);
    }
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
    setStatusMessage(
      t("glossary.common.processing", {
        action: t("glossary.common.action.publish"),
      })
    );
    setPublishing(true);
    try {
      const result =
        selectedIds.length === 1
          ? await publishCandidate(selectedIds[0])
          : await publishCandidates(selectedIds);
      if (result.error) {
        setFeedback({
          type: "error",
          title: t("glossary.publish.failed"),
          message:
            result.error ?? t("glossary.publish.failedMessage"),
        });
        return;
      }
      setFeedback({
        type: "success",
        title: t("glossary.publish.success"),
        message: t("glossary.publish.successMessage"),
      });
      await reload(offset, t("glossary.common.action.refresh"));
    } finally {
      setPublishing(false);
      setStatusMessage(null);
    }
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <FeedbackBanner type="info" title={statusMessage} />
      )}
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
          <h1 className="text-lg font-semibold">
            {isPublishMode
              ? t("glossary.publish.title")
              : t("glossary.knowbase.title")}
          </h1>
          <p className="text-sm opacity-70">
            {isPublishMode
              ? t("glossary.publish.subtitle")
              : t("glossary.knowbase.subtitle")}
          </p>
        </div>
        {isPublishMode && (
          <button
            type="button"
            className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-50"
            disabled={!selectedIds.length || publishing}
            onClick={handlePublish}
          >
            {t("glossary.common.publish")}
          </button>
        )}
      </div>

      {loading && (
        <span className="text-sm opacity-60">
          {t("common.loading")}
        </span>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          placeholder={t("glossary.candidates.searchPlaceholder")}
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            reload(0, t("glossary.common.action.search"), nextQuery);
          }}
        />
        {query && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => {
              setQuery("");
              reload(0, t("glossary.common.action.clearSearch"), "");
            }}
          >
            {t("glossary.common.clear")}
          </button>
        )}
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {isPublishMode && (
                <th className="border-b px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) =>
                      toggleSelectAll(event.target.checked)
                    }
                    aria-label={t("glossary.common.selectAll")}
                  />
                </th>
              )}
              <th className="border-b px-3 py-2 text-left">
                {t("glossary.candidates.columns.canonical")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("glossary.candidates.columns.role")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("glossary.candidates.columns.confidence")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("glossary.candidates.columns.status")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("glossary.dependencies.column")}
              </th>
              {!isPublishMode && (
                <th className="border-b px-3 py-2 text-left">
                  {t("glossary.graph.column")}
                </th>
              )}
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
              const normalizedStatus =
                normalizeStatus(displayStatus);
              const canViewGraph = isPublishMode
                ? normalizedStatus === "PUBLISHED"
                : true;

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
                  {isPublishMode && (
                    <td
                      className="border-b px-3 py-2"
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(r.id)}
                        onChange={(event) =>
                          toggleRow(
                            r.id,
                            event.target.checked
                          )
                        }
                        aria-label={t("glossary.common.selectRow", {
                          name: r.canonical,
                        })}
                      />
                    </td>
                  )}
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
                        title={t("glossary.dependencies.viewPending")}
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
                  {!isPublishMode && (
                    <td className="border-b px-3 py-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                        disabled={!canViewGraph}
                        onClick={(event) => {
                          event.stopPropagation();
                          openGraph(r.id);
                        }}
                      >
                        {t("glossary.common.view")}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}

            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={isPublishMode ? 6 : 6}
                  className="px-3 py-6 text-center text-sm opacity-60"
                >
                  {isPublishMode
                    ? t("glossary.publish.empty")
                    : t("glossary.knowbase.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="opacity-70">
          {t("glossary.common.pageLabel", {
            page: Math.floor(offset / PAGE_SIZE) + 1,
          })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-40"
            disabled={loading || offset === 0}
            onClick={() =>
              reload(
                Math.max(0, offset - PAGE_SIZE),
                t("glossary.common.action.prevPage"),
                query
              )
            }
          >
            {t("glossary.common.prev")}
          </button>
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-sm disabled:opacity-40"
            disabled={loading || !hasMore}
            onClick={() => {
              const nextOffset =
                nextCursor ?? offset + PAGE_SIZE;
              reload(
                nextOffset,
                t("glossary.common.action.nextPage"),
                query
              );
            }}
          >
            {t("glossary.common.next")}
          </button>
        </div>
      </div>

      <DependencyDialog
        open={dependencyOpen}
        title={dependencyTitle}
        rows={dependencyRows}
        onClose={() => setDependencyOpen(false)}
      />

      {!isPublishMode && (
        <ConceptGraphDialog
          open={graphOpen}
          loading={graphLoading}
          error={graphError}
          data={graphData}
          depth={graphDepth}
          maxNodes={graphMaxNodes}
          containerRef={graphContainerRef}
          onExpand={expandGraph}
          onClose={() => setGraphOpen(false)}
        />
      )}
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
    if (normalized === "APPROVED") return t("glossary.status.approved");
    if (normalized === "PUBLISHED") return t("glossary.status.published");
    if (normalized === "ARCHIVED") return t("glossary.status.archived");
    if (normalized === "CANDIDATE") return t("glossary.status.candidate");
    if (normalized === "IN_REVIEW") return t("glossary.status.underReview");
    if (normalized === "SUBMITTED") return t("glossary.status.underReview");
    return t("glossary.status.pending");
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
          {t("glossary.dependencies.title", { title })}
        </div>
        <p className="mt-2 text-sm opacity-70">
          {t("glossary.dependencies.subtitle")}
        </p>

        <div className="mt-4 space-y-4 text-sm">
          {rows.length ? (
            <>
              <div className="space-y-2">
                <div className="font-medium">
                  {t("glossary.dependencies.outgoing")}
                </div>
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
                  <div className="text-sm opacity-60">
                    {t("glossary.dependencies.none")}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="font-medium">
                  {t("glossary.dependencies.incoming")}
                </div>
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
                  <div className="text-sm opacity-60">
                    {t("glossary.dependencies.none")}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm opacity-60">
              {t("glossary.dependencies.empty")}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onClose}
          >
            {t("glossary.common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConceptGraphDialog({
  open,
  loading,
  error,
  data,
  depth,
  maxNodes,
  containerRef,
  onExpand,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  data: ConceptGraphResponse | null;
  depth: number;
  maxNodes: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onExpand: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open || !data || !containerRef.current) return;

    const elements = [
      ...data.nodes.map((node) => ({
        data: {
          id: String(node.id),
          label: node.canonical,
          type: node.type,
          isCenter: node.id === data.center.id,
        },
      })),
      ...data.edges.map((edge) => ({
        data: {
          id: String(edge.id),
          source: String(edge.source),
          target: String(edge.target),
          label: edge.predicate,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: "cose",
        animate: true,
        fit: true,
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-valign": "center",
            "text-halign": "center",
            "font-size": 10,
            "background-color": "#e2e8f0",
            color: "#111827",
            width: 42,
            height: 42,
            "border-width": 1,
            "border-color": "#94a3b8",
          },
        },
        {
          selector: "node[isCenter]",
          style: {
            "background-color": "#111827",
            color: "#f8fafc",
            "border-color": "#111827",
          },
        },
        {
          selector: "edge",
          style: {
            label: "data(label)",
            "font-size": 9,
            color: "#334155",
            "text-rotation": "autorotate",
            "text-background-color": "#f8fafc",
            "text-background-opacity": 0.8,
            "text-background-padding": 2,
            width: 1.5,
            "line-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#94a3b8",
            "curve-style": "bezier",
          },
        },
      ],
      wheelSensitivity: 0.2,
    });

    cy.fit();

    return () => {
      cy.destroy();
    };
  }, [open, data, containerRef]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[900px] max-w-[90vw] rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">
              {t("glossary.graph.title")}
            </div>
            {data && (
              <div className="text-xs opacity-70">
                {t("glossary.graph.meta", {
                  depth,
                  nodes: data.meta.nodeCount,
                  edges: data.meta.edgeCount,
                  truncated: data.meta.truncated
                    ? t("glossary.graph.metaTruncated")
                    : "",
                })}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs disabled:opacity-40"
              disabled={loading}
              onClick={onExpand}
            >
              {t("glossary.graph.expand")}
            </button>
            <button
              type="button"
              className="rounded-md border px-3 py-1 text-xs"
              onClick={onClose}
            >
              {t("glossary.common.close")}
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-md border bg-slate-50">
          {loading && (
            <div className="p-4 text-sm opacity-70">
              {t("glossary.graph.loading")}
            </div>
          )}
          {error && (
            <div className="p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {!loading && !error && (
            <div
              ref={containerRef}
              className="h-[520px] w-full"
            />
          )}
          {!loading && !error && data?.meta.truncated && (
            <div className="border-t px-4 py-2 text-xs opacity-70">
              {t("glossary.graph.truncated", { maxNodes })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
