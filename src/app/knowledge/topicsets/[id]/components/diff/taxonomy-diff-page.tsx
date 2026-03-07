"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  TopicSetDiffResponse,
  TopicSetDiffStatus,
  TopicSetNode,
  getTopicSetDiff,
  getTopicSetTree,
  getTopicSetVersionTree,
} from "@/lib/topicset-api";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";

type DiffFilterState = {
  added: boolean;
  removed: boolean;
  moved: boolean;
  updated: boolean;
  unchanged: boolean;
};

type FlatNode = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
};

type ComputedDiffNode = {
  nodeId: string;
  status: TopicSetDiffStatus;
  oldPath?: string | null;
  newPath?: string | null;
  topicsAdded?: string[];
  topicsRemoved?: string[];
};

function flattenTree(list: TopicSetNode[], parentId: string | null, out: FlatNode[]) {
  for (const node of list) {
    out.push({
      id: node.id,
      name: node.name,
      path: node.path,
      parentId,
    });
    flattenTree(node.children ?? [], node.id, out);
  }
}

function statusToClass(status: TopicSetDiffStatus) {
  if (status === "ADDED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REMOVED") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "MOVED") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "UPDATED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusToLabel(status: TopicSetDiffStatus) {
  if (status === "ADDED") return t("topicSet.diff.status.added");
  if (status === "REMOVED") return t("topicSet.diff.status.removed");
  if (status === "MOVED") return t("topicSet.diff.status.moved");
  if (status === "UPDATED") return t("topicSet.diff.status.updated");
  return t("topicSet.diff.status.unchanged");
}

function isStatusVisible(status: TopicSetDiffStatus, filters: DiffFilterState) {
  if (status === "ADDED") return filters.added;
  if (status === "REMOVED") return filters.removed;
  if (status === "MOVED") return filters.moved;
  if (status === "UPDATED") return filters.updated;
  return filters.unchanged;
}

function computeTreeDiff(
  fromTree: TopicSetNode[],
  toTree: TopicSetNode[],
  apiDiff?: TopicSetDiffResponse | null
) {
  const fromFlat: FlatNode[] = [];
  const toFlat: FlatNode[] = [];
  flattenTree(fromTree, null, fromFlat);
  flattenTree(toTree, null, toFlat);

  const fromById = new Map(fromFlat.map((item) => [item.id, item] as const));
  const toById = new Map(toFlat.map((item) => [item.id, item] as const));
  const allIds = new Set([...fromById.keys(), ...toById.keys()]);

  const nodes: ComputedDiffNode[] = [];
  for (const nodeId of allIds) {
    const left = fromById.get(nodeId);
    const right = toById.get(nodeId);

    if (!left && right) {
      nodes.push({
        nodeId,
        status: "ADDED",
        oldPath: null,
        newPath: right.path,
      });
      continue;
    }
    if (left && !right) {
      nodes.push({
        nodeId,
        status: "REMOVED",
        oldPath: left.path,
        newPath: null,
      });
      continue;
    }
    if (!left || !right) continue;

    const moved = left.parentId !== right.parentId || left.path !== right.path;
    nodes.push({
      nodeId,
      status: moved ? "MOVED" : "UNCHANGED",
      oldPath: left.path,
      newPath: right.path,
    });
  }

  if (apiDiff?.nodes?.length) {
    const overlayById = new Map(apiDiff.nodes.map((item) => [item.nodeId, item] as const));
    for (let i = 0; i < nodes.length; i += 1) {
      const overlay = overlayById.get(nodes[i].nodeId);
      if (!overlay) continue;
      nodes[i] = {
        ...nodes[i],
        status: overlay.status ?? nodes[i].status,
        oldPath: overlay.oldPath ?? nodes[i].oldPath,
        newPath: overlay.newPath ?? nodes[i].newPath,
      };
    }
  }

  const fallbackSummary = {
    nodesAdded: nodes.filter((item) => item.status === "ADDED").length,
    nodesRemoved: nodes.filter((item) => item.status === "REMOVED").length,
    nodesMoved: nodes.filter((item) => item.status === "MOVED").length,
    nodesUpdated: nodes.filter((item) => item.status === "UPDATED").length,
    topicBindingsChanged: 0,
  };

  if (apiDiff?.topicBindings?.length) {
    const topicBindingByNode = new Map<
      string,
      {
        added: string[];
        removed: string[];
      }
    >();

    for (const item of apiDiff.topicBindings) {
      const current = topicBindingByNode.get(item.nodeId) ?? { added: [], removed: [] };
      if (item.change === "ADDED") {
        current.added.push(item.topicName ?? item.topicId);
      } else {
        current.removed.push(item.topicName ?? item.topicId);
      }
      topicBindingByNode.set(item.nodeId, current);
    }

    for (let i = 0; i < nodes.length; i += 1) {
      const binding = topicBindingByNode.get(nodes[i].nodeId);
      if (!binding) continue;
      nodes[i] = {
        ...nodes[i],
        topicsAdded: binding.added,
        topicsRemoved: binding.removed,
      };
    }
  }

  if (apiDiff?.summary) {
    return {
      summary: {
        nodesAdded: apiDiff.summary.nodesAdded ?? fallbackSummary.nodesAdded,
        nodesRemoved: apiDiff.summary.nodesRemoved ?? fallbackSummary.nodesRemoved,
        nodesMoved: apiDiff.summary.nodesMoved ?? fallbackSummary.nodesMoved,
        nodesUpdated: apiDiff.summary.nodesUpdated ?? fallbackSummary.nodesUpdated,
        topicBindingsChanged: apiDiff.summary.topicBindingsChanged ?? fallbackSummary.topicBindingsChanged,
      },
      nodes,
      fromTree,
      toTree,
    };
  }

  return { summary: fallbackSummary, nodes, fromTree, toTree };
}

function renderTreeRows(params: {
  list: TopicSetNode[];
  side: "left" | "right";
  diffByNodeId: Map<string, ComputedDiffNode>;
  filters: DiffFilterState;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onHover: (nodeId: string | null) => void;
  depth?: number;
}) {
  const { list, side, diffByNodeId, filters, selectedNodeId, hoveredNodeId, onSelect, onHover, depth = 0 } = params;
  return list.map((node) => {
    const diff = diffByNodeId.get(node.id);
    const status = diff?.status ?? "UNCHANGED";
    const children = renderTreeRows({
      list: node.children ?? [],
      side,
      diffByNodeId,
      filters,
      selectedNodeId,
      hoveredNodeId,
      onSelect,
      onHover,
      depth: depth + 1,
    });

    const hiddenBySide = (side === "left" && status === "ADDED") || (side === "right" && status === "REMOVED");
    const hiddenByFilter = !isStatusVisible(status, filters);
    const showSelf = !hiddenBySide && !hiddenByFilter;
    if (!showSelf && children.length === 0) return null;

    return (
      <div key={`${side}:${node.id}`}>
        {showSelf && (
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted/40",
              selectedNodeId === node.id ? "bg-muted" : "",
              hoveredNodeId === node.id ? "bg-sky-50" : ""
            )}
            data-node-id={node.id}
            data-node-side={side}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            onClick={() => onSelect(node.id)}
            onMouseEnter={() => onHover(node.id)}
            onMouseLeave={() => onHover(null)}
          >
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px]", statusToClass(status))}>
              {statusToLabel(status)}
            </span>
            <span className="truncate">{node.name}</span>
          </button>
        )}
        {children}
      </div>
    );
  });
}

export function TaxonomyDiffPage({
  topicSetId,
  fromVersion,
  toVersion,
  currentVersion,
}: {
  topicSetId: string;
  fromVersion: number | null;
  toVersion: number | null;
  currentVersion: number | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DiffFilterState>({
    added: true,
    removed: true,
    moved: true,
    updated: true,
    unchanged: false,
  });
  const [data, setData] = useState<{
    summary: {
      nodesAdded: number;
      nodesRemoved: number;
      nodesMoved: number;
      nodesUpdated: number;
      topicBindingsChanged: number;
    };
    nodes: ComputedDiffNode[];
    fromTree: TopicSetNode[];
    toTree: TopicSetNode[];
  } | null>(null);
  const leftTreeRef = useRef<HTMLDivElement | null>(null);
  const rightTreeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!topicSetId || fromVersion == null || toVersion == null) {
        setData(null);
        return;
      }
      setLoading(true);
      setError(null);

      const [apiDiffResult, fromTreeResult, toTreeResult] = await Promise.all([
        getTopicSetDiff({
          topicSetId,
          fromVersion,
          toVersion,
        }),
        fromVersion === currentVersion
          ? getTopicSetTree(topicSetId)
          : getTopicSetVersionTree(topicSetId, fromVersion),
        toVersion === currentVersion
          ? getTopicSetTree(topicSetId)
          : getTopicSetVersionTree(topicSetId, toVersion),
      ]);

      if (cancelled) return;
      setLoading(false);

      if (!fromTreeResult.data || !toTreeResult.data) {
        setError(fromTreeResult.error ?? toTreeResult.error ?? t("topicSet.diff.loadFailed"));
        return;
      }

      setData(computeTreeDiff(fromTreeResult.data, toTreeResult.data, apiDiffResult.data ?? null));
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [topicSetId, fromVersion, toVersion, currentVersion]);

  const diffByNodeId = useMemo(
    () => new Map((data?.nodes ?? []).map((item) => [item.nodeId, item] as const)),
    [data]
  );
  const selectedDiffNode = selectedNodeId ? diffByNodeId.get(selectedNodeId) : null;
  const visibleChangedNodeIds = useMemo(() => {
    if (!data) return [];
    return data.nodes
      .filter((item) => item.status !== "UNCHANGED" && isStatusVisible(item.status, filters))
      .map((item) => item.nodeId);
  }, [data, filters]);
  const selectedChangedIndex = selectedNodeId ? visibleChangedNodeIds.indexOf(selectedNodeId) : -1;

  const goToChanged = (direction: "prev" | "next") => {
    if (visibleChangedNodeIds.length === 0) return;
    if (selectedChangedIndex < 0) {
      setSelectedNodeId(direction === "next" ? visibleChangedNodeIds[0] : visibleChangedNodeIds[visibleChangedNodeIds.length - 1]);
      return;
    }
    const offset = direction === "next" ? 1 : -1;
    const nextIndex =
      (selectedChangedIndex + offset + visibleChangedNodeIds.length) % visibleChangedNodeIds.length;
    setSelectedNodeId(visibleChangedNodeIds[nextIndex]);
  };

  useEffect(() => {
    if (!selectedNodeId) return;
    const selector = `[data-node-id="${selectedNodeId}"]`;
    const leftEl = leftTreeRef.current?.querySelector(selector);
    const rightEl = rightTreeRef.current?.querySelector(selector);
    if (leftEl instanceof HTMLElement) {
      leftEl.scrollIntoView({ block: "nearest" });
    }
    if (rightEl instanceof HTMLElement) {
      rightEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedNodeId, data, filters]);

  useEffect(() => {
    if (!data) return;
    if (!selectedNodeId || !visibleChangedNodeIds.includes(selectedNodeId)) {
      setSelectedNodeId(visibleChangedNodeIds[0] ?? null);
    }
  }, [data, selectedNodeId, visibleChangedNodeIds]);

  if (fromVersion == null || toVersion == null) {
    return (
      <section className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
        {t("topicSet.diff.empty")}
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{t("topicSet.diff.title")}</h2>
        <span className="rounded bg-muted px-2 py-0.5 text-xs">
          v{fromVersion} {"->"} v{toVersion}
        </span>
      </div>

      {loading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
      {error && <div className="text-sm text-rose-700">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              {t("topicSet.diff.summary.added")}: {data.summary.nodesAdded}
            </div>
            <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm">
              {t("topicSet.diff.summary.removed")}: {data.summary.nodesRemoved}
            </div>
            <div className="rounded border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
              {t("topicSet.diff.summary.moved")}: {data.summary.nodesMoved}
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              {t("topicSet.diff.summary.updated")}: {data.summary.nodesUpdated}
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
              {t("topicSet.diff.summary.topicChanged")}: {data.summary.topicBindingsChanged}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.added}
                onChange={(event) => setFilters((prev) => ({ ...prev, added: event.target.checked }))}
              />
              {t("topicSet.diff.filter.added")}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.removed}
                onChange={(event) => setFilters((prev) => ({ ...prev, removed: event.target.checked }))}
              />
              {t("topicSet.diff.filter.removed")}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.moved}
                onChange={(event) => setFilters((prev) => ({ ...prev, moved: event.target.checked }))}
              />
              {t("topicSet.diff.filter.moved")}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.updated}
                onChange={(event) => setFilters((prev) => ({ ...prev, updated: event.target.checked }))}
              />
              {t("topicSet.diff.filter.updated")}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={filters.unchanged}
                onChange={(event) => setFilters((prev) => ({ ...prev, unchanged: event.target.checked }))}
              />
              {t("topicSet.diff.filter.unchanged")}
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1"
                onClick={() => goToChanged("prev")}
                disabled={visibleChangedNodeIds.length === 0}
              >
                {t("topicSet.diff.nav.prev")}
              </button>
              <span className="text-muted-foreground">
                {t("topicSet.diff.nav.position", {
                  index: selectedChangedIndex >= 0 ? selectedChangedIndex + 1 : 0,
                  total: visibleChangedNodeIds.length,
                })}
              </span>
              <button
                type="button"
                className="rounded border px-2 py-1"
                onClick={() => goToChanged("next")}
                disabled={visibleChangedNodeIds.length === 0}
              >
                {t("topicSet.diff.nav.next")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded border">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                {t("topicSet.diff.leftTree", { version: fromVersion })}
              </div>
              <div ref={leftTreeRef} className="max-h-[360px] overflow-auto p-2">
                {renderTreeRows({
                  list: data.fromTree,
                  side: "left",
                  diffByNodeId,
                  filters,
                  selectedNodeId,
                  hoveredNodeId,
                  onSelect: setSelectedNodeId,
                  onHover: setHoveredNodeId,
                })}
              </div>
            </div>
            <div className="rounded border">
              <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                {t("topicSet.diff.rightTree", { version: toVersion })}
              </div>
              <div ref={rightTreeRef} className="max-h-[360px] overflow-auto p-2">
                {renderTreeRows({
                  list: data.toTree,
                  side: "right",
                  diffByNodeId,
                  filters,
                  selectedNodeId,
                  hoveredNodeId,
                  onSelect: setSelectedNodeId,
                  onHover: setHoveredNodeId,
                })}
              </div>
            </div>
          </div>

          <div className="rounded border p-3 text-sm">
            <div className="mb-2 font-medium">{t("topicSet.diff.nodeChanges")}</div>
            {!selectedDiffNode ? (
              <div className="text-muted-foreground">{t("topicSet.diff.selectNode")}</div>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-muted-foreground">{t("topicSet.diff.status")}: </span>
                  <span className={cn("rounded border px-1.5 py-0.5 text-xs", statusToClass(selectedDiffNode.status))}>
                    {statusToLabel(selectedDiffNode.status)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("topicSet.diff.oldPath")}: </span>
                  <span>{selectedDiffNode.oldPath ?? "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("topicSet.diff.newPath")}: </span>
                  <span>{selectedDiffNode.newPath ?? "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("topicSet.diff.topicsAdded")}: </span>
                  <span>{(selectedDiffNode.topicsAdded ?? []).join(", ") || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("topicSet.diff.topicsRemoved")}: </span>
                  <span>{(selectedDiffNode.topicsRemoved ?? []).join(", ") || "-"}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
