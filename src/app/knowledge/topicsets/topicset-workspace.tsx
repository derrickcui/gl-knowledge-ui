"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { fetchCoverageOverview, fetchCoverageTopics } from "@/lib/governance-coverage-api";
import { fetchGovernanceTopicDocs } from "@/lib/governance-topic-detail-api";
import { NodeTopicView, TopicSetNode } from "@/lib/topicset-api";
import { useTopicSetStore } from "@/store/topicsetStore";
import { t } from "@/i18n";
import { NodeDetailPanel } from "./components/node-detail-panel";
import { PublishDialog } from "./components/publish-dialog";
import { TaxonomyTree } from "./components/taxonomy-tree";
import { TopicBindingPanel } from "./components/topic-binding-panel";
import { VersionSelector } from "./components/version-selector";

type FeedbackState = {
  type: "error" | "success" | "info";
  title: string;
  message?: string;
} | null;

function flattenNodes(nodes: TopicSetNode[]): TopicSetNode[] {
  const stack = [...nodes];
  const list: TopicSetNode[] = [];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    list.push(current);
    if (current.children.length > 0) {
      stack.unshift(...current.children);
    }
  }
  return list;
}

function isDescendant(nodes: TopicSetNode[], sourceNodeId: string, targetNodeId: string): boolean {
  function findNode(nodeId: string): TopicSetNode | null {
    const queue = [...nodes];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.id === nodeId) return current;
      queue.unshift(...current.children);
    }
    return null;
  }
  const source = findNode(sourceNodeId);
  if (!source) return false;
  const stack = [...source.children];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    if (current.id === targetNodeId) return true;
    stack.unshift(...current.children);
  }
  return false;
}

type ContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
} | null;

type DocsModalState = {
  topic: NodeTopicView;
  loading: boolean;
  rows: Array<{ docId: string; title: string; publishedAt?: string | null }>;
  error: string | null;
} | null;

type DeleteDialogState = {
  nodeId: string;
  nodeName: string;
  hasChildren: boolean;
} | null;

type WorkspaceTab = "taxonomy" | "map" | "impact" | "analytics";

type KnowledgeMapItem = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  order: number;
};

export function TopicSetWorkspace({
  initialTopicSetId,
}: {
  initialTopicSetId?: string;
}) {
  const {
    topicSets,
    topicSetId,
    topicSetDetail,
    nodes,
    selectedNode,
    topics,
    version,
    versions,
    loading,
    initialize,
    setTopicSet,
    setVersion,
    selectNode,
    createNode,
    renameNode,
    deleteNode,
    moveNode,
    bindTopic,
    unbindTopic,
    publish,
    searchTopic,
    findNodeById,
  } = useTopicSetStore();

  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [nodeSaving, setNodeSaving] = useState(false);

  const [createParentId, setCreateParentId] = useState<string | null | undefined>(undefined);
  const [createName, setCreateName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");
  const [renamingLoading, setRenamingLoading] = useState(false);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSourceNodeId, setMoveSourceNodeId] = useState<string | null>(null);
  const [moveParentId, setMoveParentId] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [docsModal, setDocsModal] = useState<DocsModalState>(null);
  const [analyticsRows, setAnalyticsRows] = useState<Array<{ name: string; hitDocs: number }>>([]);
  const [analyticsUnmappedDocs, setAnalyticsUnmappedDocs] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("taxonomy");
  const [impactTopicId, setImpactTopicId] = useState<string>("");
  const [impactDocsLoading, setImpactDocsLoading] = useState(false);
  const [impactDocsError, setImpactDocsError] = useState<string | null>(null);
  const [impactDocs, setImpactDocs] = useState<
    Array<{ docId: string; title: string; weight: number; publishedAt?: string | null }>
  >([]);
  const tabLabelKey: Record<WorkspaceTab, Parameters<typeof t>[0]> = {
    taxonomy: "topicSet.tab.taxonomy",
    map: "topicSet.tab.map",
    impact: "topicSet.tab.impact",
    analytics: "topicSet.tab.analytics",
  };

  useEffect(() => {
    if (initialTopicSetId) {
      setTopicSet(initialTopicSetId);
      return;
    }
    initialize();
  }, [initialize, initialTopicSetId, setTopicSet]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const selectedNodeData = findNodeById(selectedNode);
  const selectedNodeTopics = selectedNode ? topics[selectedNode] ?? [] : [];
  const flatNodes = useMemo(() => flattenNodes(nodes), [nodes]);
  const editable = useMemo(() => {
    if (!topicSetDetail) return false;
    if (version == null) return true;
    return version === topicSetDetail.version;
  }, [topicSetDetail, version]);

  useEffect(() => {
    let cancelled = false;
    async function loadAnalytics() {
      const [topicsResult, overviewResult] = await Promise.all([
        fetchCoverageTopics(),
        fetchCoverageOverview(),
      ]);
      if (!topicsResult.data || cancelled) return;

      const nodeById = new Map(flatNodes.map((node) => [node.id, node] as const));
      const topicToTop: Record<string, string> = {};
      for (const [nodeId, nodeTopics] of Object.entries(topics)) {
        const node = nodeById.get(nodeId);
        if (!node) continue;
        const top = node.path.split("/").filter(Boolean)[0] ?? node.name;
        for (const topic of nodeTopics) {
          topicToTop[topic.topicId] = top;
        }
      }
      const totals: Record<string, number> = {};
      for (const item of topicsResult.data.topics ?? []) {
        const key = topicToTop[item.topicId] ?? "Unmapped";
        totals[key] = (totals[key] ?? 0) + (item.hitDocs ?? 0);
      }
      const rows = Object.entries(totals)
        .map(([name, hitDocs]) => ({ name, hitDocs }))
        .sort((a, b) => b.hitDocs - a.hitDocs)
        .slice(0, 8);
      if (!cancelled) {
        setAnalyticsRows(rows);
        setAnalyticsUnmappedDocs(overviewResult.data?.uncoveredDocs ?? 0);
      }
    }
    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [flatNodes, topics]);

  useEffect(() => {
    const firstTopicId = selectedNodeTopics[0]?.topicId ?? "";
    setImpactTopicId(firstTopicId);
  }, [selectedNode, selectedNodeTopics]);

  useEffect(() => {
    let cancelled = false;
    async function loadImpactDocs() {
      if (!impactTopicId) {
        setImpactDocs([]);
        setImpactDocsError(null);
        return;
      }
      setImpactDocsLoading(true);
      setImpactDocsError(null);
      const result = await fetchGovernanceTopicDocs(impactTopicId, {
        matchMode: "REALTIME",
        page: 1,
        size: 50,
        sortBy: "WEIGHT",
        sortOrder: "DESC",
      });
      if (cancelled) return;
      setImpactDocsLoading(false);
      if (!result.data) {
        setImpactDocsError(result.error ?? t("topicSet.feedback.loadDocsFailed"));
        return;
      }
      setImpactDocs(
        (result.data.items ?? []).map((item) => ({
          docId: item.docId,
          title: item.title,
          weight: Number(item.weight ?? 0),
          publishedAt: item.publishedAt,
        }))
      );
    }
    loadImpactDocs();
    return () => {
      cancelled = true;
    };
  }, [impactTopicId]);

  const mapItems = useMemo(() => {
    const items: KnowledgeMapItem[] = [];
    function walk(list: TopicSetNode[], parentId: string | null, depth: number) {
      list.forEach((node, index) => {
        items.push({
          id: node.id,
          name: node.name,
          parentId,
          depth,
          order: index,
        });
        walk(node.children, node.id, depth + 1);
      });
    }
    walk(nodes, null, 0);
    return items;
  }, [nodes]);

  const activeVersionLabel = useMemo(() => {
    if (!topicSetDetail) return "-";
    if (version == null || version === topicSetDetail.version) {
      return `${t("topicSet.version.draft")} v${topicSetDetail.version}`;
    }
    return `${t("topicSet.version.published")} v${version}`;
  }, [version, topicSetDetail]);

  const normalizedMoveSourceNode = findNodeById(moveSourceNodeId);
  const canEdit = Boolean(topicSetDetail) && editable;

  async function handleCreateInlineNode(nextName?: string) {
    const resolvedName = (nextName ?? createName).trim();
    if (!resolvedName) return;
    setCreateLoading(true);
    const result = await createNode({
      parentId: createParentId ?? null,
      name: resolvedName,
      description: null,
    });
    setCreateLoading(false);
    if (!result.ok) {
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.createFailed"),
        message: result.error,
      });
      return;
    }
    setCreateName("");
    setCreateParentId(undefined);
  }

  async function handleRenameInlineNode(nextName?: string) {
    const resolvedName = (nextName ?? renamingName).trim();
    if (!renamingNodeId || !resolvedName) return;
    setRenamingLoading(true);
    const result = await renameNode(renamingNodeId, {
      name: resolvedName,
      description: null,
    });
    setRenamingLoading(false);
    if (!result.ok) {
      setFeedback({
        type: "error",
        title: t("topicSet.feedback.renameFailed"),
        message: result.error,
      });
      return;
    }
    setRenamingNodeId(null);
    setRenamingName("");
  }

  return (
    <div className="space-y-4 p-5">
      <h1 className="text-xl font-semibold">{t("topicSet.workspace.title")}</h1>

      {feedback && (
        <FeedbackBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <section className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("topicSet.workspace.topicSet")}</span>
            <select
              className="h-9 rounded-md border bg-white px-2 text-sm"
              value={topicSetId ?? ""}
              onChange={(event) => setTopicSet(event.target.value)}
              disabled={loading || topicSets.length === 0}
            >
              {topicSets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <VersionSelector
            currentVersion={topicSetDetail?.version}
            selectedVersion={version}
            versions={versions}
            onChange={setVersion}
          />

          <button
            type="button"
            className="ml-auto rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40"
            onClick={() => setPublishOpen(true)}
            disabled={!editable || !topicSetDetail}
          >
            {t("topicSet.workspace.publish")}
          </button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {t("topicSet.workspace.versionLabel")}: {activeVersionLabel}{" "}
          {editable ? "" : `(${t("topicSet.workspace.viewMode")})`}
        </div>
      </section>

      <section className="rounded-lg border bg-white">
        <div className="flex items-center gap-1 border-b px-3 py-2">
          {(["taxonomy", "map", "impact", "analytics"] as WorkspaceTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                activeTab === tab ? "bg-black text-white" : "hover:bg-muted"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {t(tabLabelKey[tab])}
            </button>
          ))}
        </div>
      </section>
      {activeTab === "taxonomy" && (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (!canEdit) {
                  setFeedback({
                    type: "info",
                    title: t("topicSet.feedback.readonlyTitle"),
                    message: t("topicSet.feedback.readonlyMessage"),
                  });
                  return;
                }
                setCreateParentId(null);
                setCreateName("");
              }}
            >
              {t("topicSet.workspace.addRootNode")}
            </button>
          </div>
          <TaxonomyTree
            nodes={nodes}
            selectedNodeId={selectedNode}
            dragDisabled={!canEdit}
            creatingParentId={createParentId}
            creatingName={createName}
            creatingLoading={createLoading}
            renamingNodeId={renamingNodeId}
            renamingName={renamingName}
            renamingLoading={renamingLoading}
            onSelect={selectNode}
            onContextMenu={(nodeId, x, y) => setContextMenu({ nodeId, x, y })}
            onStartCreate={(parentId) => {
              if (!canEdit) {
                setFeedback({
                  type: "info",
                  title: t("topicSet.feedback.readonlyTitle"),
                  message: t("topicSet.feedback.readonlyMessage"),
                });
                return;
              }
              setCreateParentId(parentId);
              setCreateName("");
            }}
            onChangeCreatingName={setCreateName}
            onConfirmCreate={handleCreateInlineNode}
            onCancelCreate={() => {
              setCreateParentId(undefined);
              setCreateName("");
            }}
            onStartRename={(nodeId, currentName) => {
              if (!canEdit) {
                setFeedback({
                  type: "info",
                  title: t("topicSet.feedback.readonlyTitle"),
                  message: t("topicSet.feedback.readonlyMessage"),
                });
                return;
              }
              setRenamingNodeId(nodeId);
              setRenamingName(currentName);
            }}
            onChangeRenamingName={setRenamingName}
            onConfirmRename={handleRenameInlineNode}
            onCancelRename={() => {
              setRenamingNodeId(null);
              setRenamingName("");
            }}
            onMoveByDrag={async ({ sourceNodeId, newParentId, index }) => {
              if (!canEdit) {
                setFeedback({
                  type: "info",
                  title: t("topicSet.feedback.readonlyTitle"),
                  message: t("topicSet.feedback.readonlyMessage"),
                });
                return;
              }
              if (sourceNodeId === newParentId) return;
              if (isDescendant(nodes, sourceNodeId, newParentId)) {
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.invalidMoveTitle"),
                  message: t("topicSet.feedback.invalidMoveMessage"),
                });
                return;
              }
              const result = await moveNode(sourceNodeId, newParentId, index);
              if (!result.ok) {
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.moveFailed"),
                  message: result.error,
                });
              }
            }}
          />
        </div>

        <div className="xl:col-span-1">
          <NodeDetailPanel
            node={selectedNodeData}
            topicsBound={selectedNodeTopics.length}
            readOnly={!canEdit}
            description=""
            saving={nodeSaving}
            onSave={async ({ name, description }) => {
              if (!selectedNodeData) return;
              setNodeSaving(true);
              const result = await renameNode(selectedNodeData.id, {
                name,
                description: description || null,
              });
              setNodeSaving(false);
              if (!result.ok) {
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.updateFailed"),
                  message: result.error,
                });
                return;
              }
              setFeedback({ type: "success", title: t("topicSet.feedback.nodeUpdated") });
            }}
          />
        </div>

        <div className="xl:col-span-1">
          <TopicBindingPanel
            readOnly={!canEdit || !selectedNode}
            boundTopics={selectedNodeTopics}
            loadingBoundTopics={false}
            onSearch={searchTopic}
            onBind={async (topicId) => {
              if (!selectedNode) return;
              const result = await bindTopic(selectedNode, topicId);
              if (!result.ok) {
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.bindFailed"),
                  message: result.error,
                });
              }
            }}
            onUnbind={async (topicId) => {
              if (!selectedNode) return;
              const result = await unbindTopic(selectedNode, topicId);
              if (!result.ok) {
                setFeedback({
                  type: "error",
                  title: t("topicSet.feedback.unbindFailed"),
                  message: result.error,
                });
              }
            }}
            onViewDocuments={async (topic) => {
              setDocsModal({
                topic,
                loading: true,
                rows: [],
                error: null,
              });
              const result = await fetchGovernanceTopicDocs(topic.topicId, {
                matchMode: "REALTIME",
                size: 20,
                sortBy: "TIME",
              });
              if (!result.data) {
                setDocsModal({
                  topic,
                  loading: false,
                  rows: [],
                  error: result.error ?? t("topicSet.feedback.loadDocsFailed"),
                });
                return;
              }
              setDocsModal({
                topic,
                loading: false,
                rows: (result.data.items ?? []).map((item) => ({
                  docId: item.docId,
                  title: item.title,
                  publishedAt: item.publishedAt,
                })),
                error: null,
              });
            }}
          />
        </div>
      </section>
      )}

      {activeTab === "map" && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">{t("topicSet.map.title")}</h2>
          <div className="grid grid-cols-1 gap-2">
            {mapItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-md border px-3 py-2 text-left text-sm hover:bg-muted/40 ${
                  selectedNode === item.id ? "border-black bg-muted/50" : ""
                }`}
                style={{ marginLeft: `${item.depth * 20}px` }}
                onClick={() => {
                  selectNode(item.id);
                  setActiveTab("impact");
                }}
              >
                {item.name}
              </button>
            ))}
            {mapItems.length === 0 && (
              <div className="text-sm text-muted-foreground">{t("topicSet.tree.empty")}</div>
            )}
          </div>
        </section>
      )}

      {activeTab === "impact" && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">{t("topicSet.impact.title")}</h2>
          <div className="mt-3 text-sm text-muted-foreground">
            {t("topicSet.impact.node")}: {selectedNodeData?.name ?? "-"}
          </div>
          <div className="mt-3">
            <div className="mb-1 text-xs text-muted-foreground">{t("topicSet.binding.topicsBound")}</div>
            <div className="flex flex-wrap gap-2">
              {selectedNodeTopics.map((item) => (
                <button
                  key={item.topicId}
                  type="button"
                  className={`rounded border px-2 py-1 text-xs ${
                    impactTopicId === item.topicId ? "border-black bg-muted/40" : ""
                  }`}
                  onClick={() => setImpactTopicId(item.topicId)}
                >
                  {item.topicName ?? item.topicId}
                </button>
              ))}
              {selectedNodeTopics.length === 0 && (
                <span className="text-xs text-muted-foreground">{t("topicSet.binding.empty")}</span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-xs text-muted-foreground">{t("topicSet.impact.docs")}</div>
            {impactDocsLoading && <div className="text-sm text-muted-foreground">{t("common.loading")}</div>}
            {impactDocsError && <div className="text-sm text-rose-700">{impactDocsError}</div>}
            {!impactDocsLoading && !impactDocsError && (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">{t("topicSet.docs.columnTitle")}</th>
                    <th className="py-2">{t("topicSet.docs.columnTopic")}</th>
                    <th className="py-2">{t("topicSet.impact.score")}</th>
                  </tr>
                </thead>
                <tbody>
                  {impactDocs.map((row) => (
                    <tr key={row.docId} className="border-b">
                      <td className="py-2">{row.title}</td>
                      <td className="py-2">
                        {selectedNodeTopics.find((x) => x.topicId === impactTopicId)?.topicName ?? impactTopicId}
                      </td>
                      <td className="py-2">{row.weight.toFixed(2)}</td>
                    </tr>
                  ))}
                  {impactDocs.length === 0 && (
                    <tr>
                      <td className="py-4 text-muted-foreground" colSpan={3}>
                        {t("topicSet.docs.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {activeTab === "analytics" && (
        <section className="rounded-lg border bg-white p-4">
          <h2 className="text-sm font-semibold">{t("topicSet.analytics.dashboardTitle")}</h2>
          <div className="mt-4 space-y-3">
            <div className="text-xs text-muted-foreground">{t("topicSet.analytics.coverage")}</div>
            {analyticsRows.map((row) => {
              const width = Math.max(8, Math.min(100, row.hitDocs / 2));
              return (
                <div key={row.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{row.name}</span>
                    <span>{row.hitDocs}</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div className="h-2 rounded bg-black" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
            {analyticsRows.length === 0 && (
              <div className="text-xs text-muted-foreground">{t("topicSet.analytics.empty")}</div>
            )}
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t("topicSet.analytics.unmapped", { count: analyticsUnmappedDocs })}
            </div>
          </div>
        </section>
      )}

      {contextMenu && (
        <div
          className="fixed z-40 w-44 rounded-md border bg-white py-1 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setCreateParentId(contextMenu.nodeId);
              setCreateName("");
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.addChild")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              const node = findNodeById(contextMenu.nodeId);
              if (!node || !canEdit) {
                setFeedback({
                  type: "info",
                  title: t("topicSet.feedback.readonlyTitle"),
                  message: t("topicSet.feedback.readonlyMessage"),
                });
                return;
              }
              setRenamingNodeId(node.id);
              setRenamingName(node.name);
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.rename")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              setMoveSourceNodeId(contextMenu.nodeId);
              setMoveParentId(null);
              setMoveOpen(true);
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.move")}
          </button>
          <button
            type="button"
            className="block w-full px-3 py-1.5 text-left text-sm text-rose-700 hover:bg-rose-50"
            onClick={() => {
              if (!canEdit) {
                setFeedback({
                  type: "info",
                  title: t("topicSet.feedback.readonlyTitle"),
                  message: t("topicSet.feedback.readonlyMessage"),
                });
                return;
              }
              const node = findNodeById(contextMenu.nodeId);
              if (!node) return;
              setDeleteDialog({
                nodeId: node.id,
                nodeName: node.name,
                hasChildren: node.children.length > 0,
              });
              setContextMenu(null);
            }}
          >
            {t("topicSet.menu.delete")}
          </button>
        </div>
      )}

      {moveOpen && normalizedMoveSourceNode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.move.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("topicSet.move.node")}: {normalizedMoveSourceNode.path}
            </p>
            <div className="mt-4">
              <label className="text-sm">{t("topicSet.move.newParent")}</label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm"
                value={moveParentId ?? ""}
                onChange={(event) => setMoveParentId(event.target.value || null)}
              >
                <option value="">{t("topicSet.move.selectParent")}</option>
                {flatNodes
                  .filter((node) => {
                    if (node.id === normalizedMoveSourceNode.id) return false;
                    if (isDescendant(nodes, normalizedMoveSourceNode.id, node.id)) return false;
                    return true;
                  })
                  .map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.path}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => setMoveOpen(false)}>
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={!moveParentId || moveLoading}
                onClick={async () => {
                  if (!moveSourceNodeId || !moveParentId) return;
                  setMoveLoading(true);
                  const result = await moveNode(moveSourceNodeId, moveParentId, null);
                  setMoveLoading(false);
                  if (!result.ok) {
                    setFeedback({
                      type: "error",
                      title: t("topicSet.feedback.moveFailed"),
                      message: result.error,
                    });
                    return;
                  }
                  setMoveOpen(false);
                }}
              >
                {t("topicSet.menu.move")}
              </button>
            </div>
          </div>
        </div>
      )}

      <PublishDialog
        open={publishOpen}
        versionLabel={activeVersionLabel}
        loading={publishLoading}
        onClose={() => setPublishOpen(false)}
        onPublish={async (comment) => {
          setPublishLoading(true);
          const result = await publish(comment);
          setPublishLoading(false);
          if (!result.ok) {
            setFeedback({
              type: "error",
              title: t("topicSet.feedback.publishFailed"),
              message: result.error,
            });
            return;
          }
          setPublishOpen(false);
          setFeedback({
            type: "success",
            title: `${t("topicSet.feedback.published")} v${result.version ?? "-"}`,
          });
        }}
      />

      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">{t("topicSet.delete.title")}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {t("topicSet.delete.message")} <span className="font-medium">{deleteDialog.nodeName}</span>
            </p>
            {deleteDialog.hasChildren && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t("topicSet.delete.warning")}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => setDeleteDialog(null)}
                disabled={deleteLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteLoading(true);
                  const result = await deleteNode(deleteDialog.nodeId);
                  setDeleteLoading(false);
                  if (!result.ok) {
                    setFeedback({
                      type: "error",
                      title: t("topicSet.feedback.deleteFailed"),
                      message: result.error,
                    });
                    return;
                  }
                  setDeleteDialog(null);
                }}
              >
                {deleteLoading ? t("topicSet.delete.deleting") : t("topicSet.menu.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {docsModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[70vh] w-[760px] overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {t("topicSet.docs.title")}: {docsModal.topic.topicName ?? docsModal.topic.topicId}
              </h3>
              <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setDocsModal(null)}>
                {t("common.close")}
              </button>
            </div>
            {docsModal.loading && <div className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</div>}
            {docsModal.error && <div className="mt-4 text-sm text-rose-700">{docsModal.error}</div>}
            {!docsModal.loading && !docsModal.error && (
              <table className="mt-4 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2">{t("topicSet.docs.columnTitle")}</th>
                    <th className="py-2">{t("topicSet.docs.columnTopic")}</th>
                    <th className="py-2">{t("topicSet.docs.columnDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {docsModal.rows.map((row) => (
                    <tr key={row.docId} className="border-b">
                      <td className="py-2">{row.title}</td>
                      <td className="py-2">{docsModal.topic.topicName ?? docsModal.topic.topicId}</td>
                      <td className="py-2">{row.publishedAt ? row.publishedAt.slice(0, 10) : "-"}</td>
                    </tr>
                  ))}
                  {docsModal.rows.length === 0 && (
                    <tr>
                      <td className="py-4 text-muted-foreground" colSpan={3}>
                        {t("topicSet.docs.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
