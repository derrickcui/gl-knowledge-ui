"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, ElementDefinition, EventObjectNode } from "cytoscape";
import { Search, ZoomIn, ZoomOut } from "lucide-react";
import { TopicSetNode, NodeTopicView } from "@/lib/topicset-api";
import { t } from "@/i18n";

function buildDisplayPath(nodeId: string, nodeMap: Record<string, TopicSetNode>) {
  const segments: string[] = [];
  const visited = new Set<string>();
  let current = nodeMap[nodeId];
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    segments.push(current.name);
    if (!current.parentId) break;
    current = nodeMap[current.parentId];
  }
  return segments.length > 0 ? segments.reverse().join(" / ") : "";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function alignViewportTopCenter(cy: Core, zoomLevel?: number) {
  const container = cy.container();
  if (!container) return;
  const elements = cy.elements();
  if (elements.length === 0) return;

  const bb = elements.boundingBox();
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;
  const horizontalPadding = 48;
  const topPadding = 56;
  const bottomPadding = 72;

  const fitZoom = Math.min(
    (width - horizontalPadding * 2) / Math.max(bb.w, 1),
    (height - topPadding - bottomPadding) / Math.max(bb.h, 1)
  );
  const zoom = clamp(zoomLevel ?? fitZoom, 0.2, 2.5);
  const centerX = (bb.x1 + bb.x2) / 2;

  cy.viewport({
    zoom,
    pan: {
      x: width / 2 - centerX * zoom,
      y: topPadding - bb.y1 * zoom,
    },
  });
}

function topicColor(topicCount: number, coverageRatio: number, heatmap: boolean) {
  if (heatmap) {
    if (coverageRatio >= 0.67) return "#22c55e";
    if (coverageRatio >= 0.34) return "#eab308";
    return "#ef4444";
  }
  if (topicCount <= 0) return "#cbd5e1";
  if (topicCount <= 3) return "#60a5fa";
  if (topicCount <= 10) return "#8b5cf6";
  return "#ef4444";
}

type KnowledgeMapPageProps = {
  topicSetName?: string | null;
  nodeMap: Record<string, TopicSetNode>;
  childrenByParent: Record<string, string[]>;
  rootNodeIds: string[];
  selectedNodeId: string | null;
  selectedNodeTopics: NodeTopicView[];
  topicsByNode: Record<string, NodeTopicView[]>;
  topicHitDocsMap: Record<string, number>;
  topicDocCountMap?: Record<string, number>;
  coverageByNodeId: Record<string, number>;
  unmappedTotal: number;
  onSelectNode: (nodeId: string) => void;
  onOpenTaxonomy: (nodeId: string) => void;
  onOpenImpact: (nodeId: string) => void;
  onOpenUnmapped: () => void;
  onLoadNodeTopics: (nodeId: string) => Promise<void>;
};

export function KnowledgeMapPage({
  topicSetName,
  nodeMap,
  childrenByParent,
  rootNodeIds,
  selectedNodeId,
  selectedNodeTopics,
  topicsByNode,
  topicHitDocsMap,
  topicDocCountMap = {},
  coverageByNodeId,
  unmappedTotal,
  onSelectNode,
  onOpenTaxonomy,
  onOpenImpact,
  onOpenUnmapped,
  onLoadNodeTopics,
}: KnowledgeMapPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [showHasTopics, setShowHasTopics] = useState(true);
  const [showNoTopics, setShowNoTopics] = useState(true);
  const [showHighCoverage, setShowHighCoverage] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string>("");
  const [searchValue, setSearchValue] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    topics: number;
    docs: number;
    coverage: number;
    kind: "node" | "topic" | "unmapped";
  } | null>(null);

  const allNodes = useMemo(() => Object.values(nodeMap), [nodeMap]);
  const getEffectiveTopicCount = useMemo(
    () => (node: TopicSetNode) => {
      const loadedTopics = topicsByNode[node.id];
      if (loadedTopics) {
        return loadedTopics.length;
      }
      return node.topicCount ?? 0;
    },
    [topicsByNode]
  );
  const maxDocs = useMemo(
    () => Math.max(1, ...allNodes.map((node) => coverageByNodeId[node.id] ?? node.docCount ?? 0), unmappedTotal),
    [allNodes, coverageByNodeId, unmappedTotal]
  );
  const highCoverageThreshold = Math.max(10, Math.round(maxDocs * 0.5));
  const searchableNodes = useMemo(
    () =>
      allNodes
        .map((node) => ({
          id: node.id,
          name: node.name,
          path: buildDisplayPath(node.id, nodeMap),
        }))
        .sort((a, b) => a.path.localeCompare(b.path)),
    [allNodes, nodeMap]
  );
  const searchResults = useMemo(() => {
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return searchableNodes.slice(0, 20);
    return searchableNodes
      .filter((item) => item.name.toLowerCase().includes(keyword) || item.path.toLowerCase().includes(keyword))
      .slice(0, 20);
  }, [searchValue, searchableNodes]);

  useEffect(() => {
    if (!showTopics) return;
    if (!selectedNodeId) return;
    if (selectedNodeId in topicsByNode) return;
    void onLoadNodeTopics(selectedNodeId);
  }, [onLoadNodeTopics, selectedNodeId, showTopics, topicsByNode]);

  const elements = useMemo(() => {
    const nodeIds = new Set<string>();
    const output: ElementDefinition[] = [];

    for (const node of allNodes) {
      const topicCount = getEffectiveTopicCount(node);
      const docs = coverageByNodeId[node.id] ?? node.docCount ?? 0;
      const includeByTopic = topicCount > 0 ? showHasTopics : showNoTopics;
      const includeByCoverage = !showHighCoverage || docs >= highCoverageThreshold;
      if (!includeByTopic || !includeByCoverage) continue;
      nodeIds.add(node.id);
      const coverageRatio = docs / Math.max(maxDocs, 1);
      output.push({
        data: {
          id: node.id,
          label: node.name,
          kind: "node",
          docs,
          topics: topicCount,
          coverage: Math.round(coverageRatio * 100),
          color: topicColor(topicCount, coverageRatio, heatmap),
          size: clamp(30 + coverageRatio * 56, 30, 86),
        },
      });
    }

    for (const parentId of Object.keys(childrenByParent)) {
      const sourceId = parentId === "__root__" ? null : parentId;
      const children = childrenByParent[parentId] ?? [];
      for (const childId of children) {
        if (!nodeIds.has(childId)) continue;
        if (sourceId && nodeIds.has(sourceId)) {
          output.push({
            data: {
              id: `${sourceId}->${childId}`,
              source: sourceId,
              target: childId,
              kind: "edge",
            },
          });
        }
      }
    }

    if (showTopics) {
      const selectedTopics = selectedNodeId ? topicsByNode[selectedNodeId] ?? [] : [];
      if (selectedNodeId && nodeIds.has(selectedNodeId)) {
        for (const topic of selectedTopics) {
          const topicDocs = topicDocCountMap[topic.topicId] ?? topicHitDocsMap[topic.topicId] ?? 0;
          output.push({
            data: {
              id: `topic:${topic.topicId}`,
              parentNodeId: selectedNodeId,
              label: topic.topicName ?? topic.topicId,
              kind: "topic",
              docs: topicDocs,
              topics: 1,
              coverage: Math.round((topicDocs / Math.max(maxDocs, 1)) * 100),
              color: "#111827",
              size: 24,
            },
          });
          output.push({
            data: {
              id: `${selectedNodeId}->topic:${topic.topicId}`,
              source: selectedNodeId,
              target: `topic:${topic.topicId}`,
              kind: "topic-edge",
            },
          });
        }
      }
    }

    return output;
  }, [
    allNodes,
    childrenByParent,
    coverageByNodeId,
    heatmap,
    highCoverageThreshold,
    maxDocs,
    showHasTopics,
    showHighCoverage,
    showNoTopics,
    selectedNodeId,
    showTopics,
    getEffectiveTopicCount,
    topicDocCountMap,
    topicHitDocsMap,
    topicsByNode,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: "breadthfirst",
        directed: true,
        padding: 30,
        spacingFactor: 1.3,
        animate: false,
        roots: rootNodeIds,
      },
      wheelSensitivity: 0.2,
      style: [
        {
          selector: 'node[kind = "node"]',
          style: {
            label: "data(label)",
            width: "data(size)",
            height: "data(size)",
            "background-color": "data(color)",
            color: "#111827",
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": "110px",
            "text-valign": "bottom",
            "text-margin-y": 10,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        {
          selector: 'node[kind = "topic"]',
          style: {
            label: "data(label)",
            shape: "diamond",
            width: "data(size)",
            height: "data(size)",
            "background-color": "#111827",
            color: "#111827",
            "font-size": 9,
            "text-wrap": "wrap",
            "text-max-width": "90px",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "border-width": 1,
            "border-color": "#94a3b8",
          },
        },
        {
          selector: 'node[kind = "unmapped"]',
          style: {
            label: "data(label)",
            shape: "round-rectangle",
            width: "data(size)",
            height: 32,
            "background-color": "#fef3c7",
            color: "#92400e",
            "font-size": 10,
            "border-width": 1,
            "border-color": "#f59e0b",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#cbd5e1",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#cbd5e1",
          },
        },
        {
          selector: 'edge[kind = "topic-edge"]',
          style: {
            width: 1,
            "line-style": "dashed",
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
          },
        },
        {
          selector: ".is-selected",
          style: {
            "border-width": 4,
            "border-color": "#0f172a",
            "overlay-color": "#0f172a",
            "overlay-opacity": 0.08,
          },
        },
        {
          selector: ".is-hovered",
          style: {
            "border-width": 4,
            "border-color": "#38bdf8",
            "overlay-color": "#38bdf8",
            "overlay-opacity": 0.1,
          },
        },
      ],
    });

    const topicNodes = cy.nodes('[kind = "topic"]');
    topicNodes.unlock();
    if (showTopics) {
      topicNodes.forEach((topicNode) => {
        const parentNodeId = String(topicNode.data("parentNodeId") ?? "");
        if (!parentNodeId) return;
        const parentNode = cy.$id(parentNodeId);
        if (!parentNode || parentNode.empty()) return;
        const siblingTopicNodes = parentNode
          .outgoers('node[kind = "topic"]')
          .toArray()
          .sort((a: { id: () => string }, b: { id: () => string }) => a.id().localeCompare(b.id()));
        const topicIndex = siblingTopicNodes.findIndex((item: { id: () => string }) => item.id() === topicNode.id());
        const siblingCount = Math.max(siblingTopicNodes.length, 1);
        const parentPosition = parentNode.position();
        const spread = 44;
        const startX = parentPosition.x - ((siblingCount - 1) * spread) / 2;
        topicNode.position({
          x: startX + topicIndex * spread,
          y: parentPosition.y + 96,
        });
        topicNode.lock();
      });
    }

    cy.on("tap", "node", (event: EventObjectNode) => {
      const id = String(event.target.id());
      const kind = String(event.target.data("kind"));
      if (kind === "topic") return;
      if (kind === "unmapped") {
        onOpenUnmapped();
        return;
      }
      onSelectNode(id);
    });

    cy.on("mouseover", "node", (event: EventObjectNode) => {
      const target = event.target;
      const id = String(target.id());
      const position = target.renderedPosition();
      const docs = Number(target.data("docs") ?? 0);
      const topics = Number(target.data("topics") ?? 0);
      const coverage = Number(target.data("coverage") ?? 0);
      const kind = String(target.data("kind")) as "node" | "topic" | "unmapped";
      setHoveredNodeId(id);
      setTooltip({
        x: position.x + 16,
        y: position.y + 16,
        name: String(target.data("label") ?? id),
        docs,
        topics,
        coverage,
        kind,
      });
    });

    cy.on("mouseout", "node", () => {
      setHoveredNodeId(null);
      setTooltip(null);
    });

    cyRef.current = cy;
    alignViewportTopCenter(cy);

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, onOpenUnmapped, onSelectNode, rootNodeIds, showTopics]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("is-selected");
    if (selectedNodeId) {
      cy.$id(selectedNodeId).addClass("is-selected");
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (!focusNodeId) return;
    const cy = cyRef.current;
    if (!cy) return;
    const target = cy.$id(focusNodeId);
    if (target.length === 0) return;
    cy.animate({
      center: { eles: target },
      zoom: Math.max(cy.zoom(), 1),
      duration: 250,
    });
  }, [focusNodeId]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("is-hovered");
    if (hoveredNodeId) {
      cy.$id(hoveredNodeId).addClass("is-hovered");
    }
  }, [hoveredNodeId]);

  const selectedNode = selectedNodeId ? nodeMap[selectedNodeId] ?? null : null;
  const selectedDocs = selectedNodeId ? coverageByNodeId[selectedNodeId] ?? selectedNode?.docCount ?? 0 : 0;
  const selectedCoverage = selectedDocs > 0 ? Math.round((selectedDocs / Math.max(maxDocs, 1)) * 100) : 0;
  const canShowTopics = Boolean(selectedNodeId);
  const visibleNodeCount = useMemo(
    () => elements.filter((item) => !("source" in (item.data ?? {})) && String(item.data?.kind) === "node").length,
    [elements]
  );

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{t("topicSet.map.title")}</h2>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {topicSetName || "-"}
        </span>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {t("topicSet.map.visibleNodes", { count: visibleNodeCount })}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-3 py-3 text-xs">
        <button
          type="button"
          className="rounded border bg-white p-1.5"
          onClick={() => {
            const cy = cyRef.current;
            if (!cy) return;
            alignViewportTopCenter(cy, cy.zoom() * 1.2);
          }}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded border bg-white p-1.5"
          onClick={() => {
            const cy = cyRef.current;
            if (!cy) return;
            alignViewportTopCenter(cy, cy.zoom() / 1.2);
          }}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded border bg-white px-2 py-1"
          onClick={() => {
            const cy = cyRef.current;
            if (!cy) return;
            alignViewportTopCenter(cy);
          }}
        >
          {t("topicSet.map.reset")}
        </button>
        <div className="flex min-w-[220px] items-center gap-2 rounded border bg-white px-2 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="w-full bg-transparent outline-none"
            value={searchValue}
            placeholder={t("topicSet.map.search")}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 rounded border bg-white px-2 py-1">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="bg-transparent outline-none"
            value={focusNodeId}
            onChange={(event) => setFocusNodeId(event.target.value)}
          >
            <option value="">{t("topicSet.map.focusNode")}</option>
            {allNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="rounded border bg-white px-2 py-1"
          onClick={() => {
            if (!focusNodeId) return;
            onSelectNode(focusNodeId);
            cyRef.current?.animate({
              center: { eles: cyRef.current.$id(focusNodeId) },
              duration: 250,
            });
          }}
        >
          {t("topicSet.map.focus")}
        </button>
        <label
          className={`inline-flex items-center gap-1 rounded border bg-white px-2 py-1 ${
            canShowTopics ? "" : "cursor-not-allowed opacity-50"
          }`}
          title={canShowTopics ? undefined : t("topicSet.map.selectNodeFirst")}
        >
          <input
            type="checkbox"
            checked={showTopics}
            disabled={!canShowTopics}
            onChange={(event) => setShowTopics(event.target.checked)}
          />
          {t("topicSet.map.showTopics")}
        </label>
        <label className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1">
          <input type="checkbox" checked={heatmap} onChange={(event) => setHeatmap(event.target.checked)} />
          {t("topicSet.map.heatmap")}
        </label>
        <label className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1">
          <input
            type="checkbox"
            checked={showHasTopics}
            onChange={(event) => setShowHasTopics(event.target.checked)}
          />
          {t("topicSet.map.filterHasTopics")}
        </label>
        <label className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1">
          <input
            type="checkbox"
            checked={showNoTopics}
            onChange={(event) => setShowNoTopics(event.target.checked)}
          />
          {t("topicSet.map.filterNoTopics")}
        </label>
        <label className="inline-flex items-center gap-1 rounded border bg-white px-2 py-1">
          <input
            type="checkbox"
            checked={showHighCoverage}
            onChange={(event) => setShowHighCoverage(event.target.checked)}
          />
          {t("topicSet.map.filterHighCoverage")}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative overflow-hidden rounded-xl border bg-[radial-gradient(circle_at_top,_#eff6ff,_#ffffff_55%)]">
          <div ref={containerRef} className="h-[680px] w-full" />
          {tooltip && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border bg-white/95 px-3 py-2 text-xs shadow-lg"
              style={{ left: clamp(tooltip.x, 8, 560), top: clamp(tooltip.y, 8, 620) }}
            >
              <div className="font-medium">{tooltip.name}</div>
              <div className="text-muted-foreground">{tooltip.topics} {t("topicSet.map.tooltipTopics")}</div>
              <div className="text-muted-foreground">{tooltip.docs} {t("topicSet.map.tooltipDocuments")}</div>
              <div className="text-muted-foreground">{tooltip.coverage}% {t("topicSet.map.tooltipCoverage")}</div>
            </div>
          )}
        </div>

        <aside className="rounded-xl border bg-slate-50/80 p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {t("topicSet.map.nodeDetail")}
          </div>
          {searchValue.trim().length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-[11px] text-muted-foreground">{t("topicSet.map.searchResults")}</div>
              <div className="max-h-40 space-y-1 overflow-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="block w-full rounded-md border bg-white px-3 py-2 text-left text-xs hover:bg-muted/30"
                    onClick={() => {
                      setFocusNodeId(item.id);
                      onSelectNode(item.id);
                    }}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="mt-1 truncate text-[10px] text-muted-foreground">{item.path}</div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                    {t("topicSet.binding.noResults")}
                  </div>
                )}
              </div>
            </div>
          )}
          {!selectedNode ? (
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <div>{t("topicSet.map.empty")}</div>
              <div className="text-xs">{t("topicSet.map.selectNodeFirst")}</div>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <div className="text-lg font-semibold">{selectedNode.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {buildDisplayPath(selectedNode.id, nodeMap)}
                </div>
                <div className="mt-2 rounded-md border bg-white px-3 py-2 text-[11px] text-muted-foreground">
                  {t("topicSet.map.breadcrumb")}: {buildDisplayPath(selectedNode.id, nodeMap)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-white px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{t("topicSet.detail.topicsBound")}</div>
                  <div className="mt-1 text-base font-semibold">{selectedNodeTopics.length}</div>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{t("topicSet.map.documents")}</div>
                  <div className="mt-1 text-base font-semibold">{selectedDocs}</div>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{t("topicSet.map.coverageRate")}</div>
                  <div className="mt-1 text-base font-semibold">{selectedCoverage}%</div>
                </div>
                <div className="rounded-lg border bg-white px-3 py-2">
                  <div className="text-[11px] text-muted-foreground">{t("topicSet.detail.depth")}</div>
                  <div className="mt-1 text-base font-semibold">{selectedNode.depth ?? 0}</div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] text-muted-foreground">{t("topicSet.binding.topicsBound")}</div>
                <div className="flex flex-wrap gap-2">
                  {selectedNodeTopics.map((topic) => (
                    <span key={topic.topicId} className="rounded-full border bg-white px-2 py-1 text-xs">
                      {topic.topicName ?? topic.topicId}
                    </span>
                  ))}
                  {selectedNodeTopics.length === 0 && (
                    <span className="text-xs text-muted-foreground">{t("topicSet.binding.empty")}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-black px-3 py-1.5 text-xs text-white"
                  onClick={() => onOpenImpact(selectedNode.id)}
                >
                  {t("topicSet.map.viewImpact")}
                </button>
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-xs"
                  onClick={() => onOpenTaxonomy(selectedNode.id)}
                >
                  {t("topicSet.map.openInTaxonomy")}
                </button>
              </div>
            </div>
          )}
          {unmappedTotal > 0 && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <div className="text-xs font-medium text-amber-800">{t("topicSet.map.unmapped")}</div>
              <div className="mt-1 text-sm text-amber-900">
                {t("topicSet.unmapped.total", { count: unmappedTotal })}
              </div>
              <button
                type="button"
                className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs text-amber-900"
                onClick={onOpenUnmapped}
              >
                {t("topicSet.map.openUnmapped")}
              </button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
