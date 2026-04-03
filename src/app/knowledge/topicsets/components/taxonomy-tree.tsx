"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { CursorProps, NodeRendererProps, Tree } from "react-arborist";
import { TopicSetNode } from "@/lib/topicset-api";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

function isImeComposing(event: KeyboardEvent<HTMLInputElement>) {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function DropCursor({ top, left, indent }: CursorProps) {
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{ top: top - 1, left: left + indent, right: 12 }}
    >
      <div className="h-0.5 rounded bg-black" />
    </div>
  );
}

type TaxonomyTreeProps = {
  nodes: TopicSetNode[];
  nodeMap?: Record<string, TopicSetNode>;
  childrenByParent?: Record<string, string[]>;
  rootNodeIds?: string[];
  selectedNodeId: string | null;
  dragDisabled?: boolean;
  creatingParentId: string | null | undefined;
  creatingName: string;
  creatingLoading?: boolean;
  renamingNodeId: string | null;
  renamingName: string;
  renamingLoading?: boolean;
  onSelect: (nodeId: string) => void;
  onExpandNode?: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onOpenImpact?: (nodeId: string) => void;
  onPrefetchImpact?: (nodeId: string) => void;
  maxDocCount?: number;
  onMoveByDrag: (payload: {
    sourceNodeId: string;
    newParentId: string;
    index: number;
  }) => void;
  onStartCreate: (parentId: string | null) => void;
  onChangeCreatingName: (name: string) => void;
  onConfirmCreate: (name: string) => void;
  onCancelCreate: () => void;
  onStartRename: (nodeId: string, currentName: string) => void;
  onChangeRenamingName: (name: string) => void;
  onConfirmRename: (name: string) => void;
  onCancelRename: () => void;
  canRenameInline?: boolean;
  aiSuggestionOpen?: boolean;
  aiSuggestionGroups?: Array<{ title: string; items: string[] }>;
  onToggleAiSuggestion?: () => void;
  onApplyAiSuggestion?: () => void;
  onCompareAiSuggestion?: () => void;
  aiNodeStateMap?: Record<
    string,
    {
      overlap?: boolean;
      empty?: boolean;
      hot?: boolean;
      uncategorized?: boolean;
    }
  >;
};

type TreeNodeData = {
  id: string;
  name: string;
  path: string;
  hasChildren: boolean;
  topicCount?: number;
  docCount?: number;
  kind?: "node" | "create-draft";
  parentId?: string | null;
};

type TreeCache = {
  nodeMap: Record<string, TopicSetNode>;
  childrenByParent: Record<string, string[]>;
  rootNodeIds: string[];
};

function buildCacheFromNested(nodes: TopicSetNode[]): TreeCache {
  const nextNodeMap: Record<string, TopicSetNode> = {};
  const nextChildrenByParent: Record<string, string[]> = {};
  const nextRootNodeIds: string[] = [];

  const walk = (list: TopicSetNode[], parentId: string | null) => {
    const key = parentId ?? "__root__";
    nextChildrenByParent[key] = list.map((item) => item.id);
    if (parentId == null) {
      nextRootNodeIds.push(...list.map((item) => item.id));
    }
    for (const node of list) {
      nextNodeMap[node.id] = node;
      walk(node.children ?? [], node.id);
    }
  };

  walk(nodes, null);
  return {
    nodeMap: nextNodeMap,
    childrenByParent: nextChildrenByParent,
    rootNodeIds: nextRootNodeIds,
  };
}

function InlineCreateRootRow({
  value,
  loading,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const [isComposing, setIsComposing] = useState(false);
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="mb-2 flex items-center gap-2 px-2">
      <input
        autoFocus
        className="h-8 flex-1 rounded-md border px-2 text-xs"
        value={draft}
        placeholder={t("topicSet.inline.placeholder")}
        onChange={(event) => setDraft(event.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDownCapture={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (isComposing || isImeComposing(event)) return;
          if (event.key === "Enter") {
            event.preventDefault();
            onChange(draft);
            onConfirm(draft);
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <button
        type="button"
        className="rounded border px-2 py-0.5 text-xs"
        onClick={() => {
          onChange(draft);
          onConfirm(draft);
        }}
        disabled={loading || !draft.trim()}
      >
        {loading ? "..." : t("topicSet.common.create")}
      </button>
      <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={onCancel}>
        {t("common.cancel")}
      </button>
    </div>
  );
}

function ArborNode({
  node,
  style,
  dragHandle,
  selectedNodeId,
  creatingParentId,
  creatingName,
  creatingLoading,
  renamingNodeId,
  renamingName,
  renamingLoading,
  onSelect,
  onExpandNode,
  onContextMenu,
  onOpenImpact,
  onPrefetchImpact,
  onStartCreate,
  onChangeCreatingName,
  onConfirmCreate,
  onCancelCreate,
  onStartRename,
  onChangeRenamingName,
  onConfirmRename,
  onCancelRename,
  canRenameInline,
  maxDocCount,
  aiNodeStateMap,
}: NodeRendererProps<TreeNodeData> & {
  selectedNodeId: string | null;
  creatingParentId: string | null | undefined;
  creatingName: string;
  creatingLoading?: boolean;
  renamingNodeId: string | null;
  renamingName: string;
  renamingLoading?: boolean;
  onSelect: (nodeId: string) => void;
  onExpandNode?: (nodeId: string) => void;
  onContextMenu: (nodeId: string, x: number, y: number) => void;
  onOpenImpact?: (nodeId: string) => void;
  onPrefetchImpact?: (nodeId: string) => void;
  onStartCreate: (parentId: string | null) => void;
  onChangeCreatingName: (name: string) => void;
  onConfirmCreate: (name: string) => void;
  onCancelCreate: () => void;
  onStartRename: (nodeId: string, currentName: string) => void;
  onChangeRenamingName: (name: string) => void;
  onConfirmRename: (name: string) => void;
  onCancelRename: () => void;
  canRenameInline?: boolean;
  maxDocCount?: number;
  aiNodeStateMap?: Record<
    string,
    {
      overlap?: boolean;
      empty?: boolean;
      hot?: boolean;
      uncategorized?: boolean;
    }
  >;
}) {
  const isCreateDraft = node.data.kind === "create-draft";
  const isSelected = selectedNodeId === node.id;
  const isCreatingHere = creatingParentId === node.id;
  const isRenamingHere = renamingNodeId === node.id;
  const nodeAiState = aiNodeStateMap?.[node.id];
  const [createDraft, setCreateDraft] = useState(creatingName);
  const [renameDraft, setRenameDraft] = useState(renamingName);
  const [isComposing, setIsComposing] = useState(false);
  const autoExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCreateDraft(creatingName);
  }, [creatingName, isCreatingHere, isCreateDraft, node.id]);

  useEffect(() => {
    setRenameDraft(renamingName);
  }, [renamingName, isRenamingHere, node.id]);

  useEffect(() => {
    const shouldAutoExpand = node.willReceiveDrop && node.isInternal && !node.isOpen;
    if (!shouldAutoExpand) {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
      return;
    }

    autoExpandTimerRef.current = setTimeout(() => {
      node.open();
      if (onExpandNode) {
        onExpandNode(node.id);
      }
      autoExpandTimerRef.current = null;
    }, 800);

    return () => {
      if (autoExpandTimerRef.current) {
        clearTimeout(autoExpandTimerRef.current);
        autoExpandTimerRef.current = null;
      }
    };
  }, [node.id, node.isInternal, node.isOpen, node.willReceiveDrop, node.open, onExpandNode]);

  if (isCreateDraft) {
    return (
      <div
        style={style}
        className="flex h-full items-center gap-2 rounded-md px-2 text-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="inline-flex h-5 w-5" />
        <input
          autoFocus
          className="h-7 min-w-0 flex-1 rounded-md border px-2 text-xs"
          value={createDraft}
          placeholder={t("topicSet.inline.placeholder")}
          onChange={(event) => setCreateDraft(event.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDownCapture={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (isComposing || isImeComposing(event)) return;
            if (event.key === "Enter") {
              event.preventDefault();
              onChangeCreatingName(createDraft);
              onConfirmCreate(createDraft);
            }
            if (event.key === "Escape") {
              event.preventDefault();
              onCancelCreate();
            }
          }}
        />
        <button
          type="button"
          className="rounded border px-2 py-0.5 text-xs"
          onClick={() => {
            onChangeCreatingName(createDraft);
            onConfirmCreate(createDraft);
          }}
          disabled={creatingLoading || !createDraft.trim()}
        >
          {creatingLoading ? "..." : t("topicSet.common.create")}
        </button>
        <button type="button" className="rounded border px-2 py-0.5 text-xs" onClick={onCancelCreate}>
          {t("common.cancel")}
        </button>
      </div>
    );
  }

  return (
    <div
      style={style}
      className={cn(
        "group flex h-full items-center gap-1 rounded-md px-2 text-sm",
        isSelected ? "bg-accent font-medium" : "hover:bg-muted/50",
        node.willReceiveDrop ? "ring-1 ring-black/25 bg-emerald-50/70" : ""
      )}
      onClick={() => onSelect(node.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu(node.id, event.clientX, event.clientY);
      }}
      onMouseEnter={() => {
        if ((node.data.topicCount ?? 0) > 0) {
          onPrefetchImpact?.(node.id);
        }
      }}
    >
      <div ref={dragHandle} className="inline-flex">
        <button
          type="button"
          className="inline-flex h-5 w-5 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
          title={t("topicSet.tree.drag")}
          aria-label={t("topicSet.tree.drag")}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-[10px] leading-none">⋮⋮</span>
        </button>
      </div>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        onClick={(event) => {
          event.stopPropagation();
          if (node.isInternal) {
            node.toggle();
          }
        }}
      >
        {node.isInternal ? (
          node.isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-0" />
        )}
      </button>

      {isRenamingHere ? (
        <>
          <input
            autoFocus
            className="h-7 min-w-0 flex-1 rounded-md border px-2 text-xs"
            value={renameDraft}
            placeholder={t("topicSet.inline.renamePlaceholder")}
            onChange={(event) => setRenameDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDownCapture={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (isComposing || isImeComposing(event)) return;
              if (event.key === "Enter") {
                event.preventDefault();
                onChangeRenamingName(renameDraft);
                onConfirmRename(renameDraft);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelRename();
              }
            }}
          />
          <button
            type="button"
            className="rounded border px-2 py-0.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onChangeRenamingName(renameDraft);
              onConfirmRename(renameDraft);
            }}
            disabled={renamingLoading || !renameDraft.trim()}
          >
            {renamingLoading ? "..." : t("topicSet.common.save")}
          </button>
          <button
            type="button"
            className="rounded border px-2 py-0.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onCancelRename();
            }}
          >
            {t("common.cancel")}
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(node.id);
              if (canRenameInline && isSelected) {
                onStartRename(node.id, node.data.name);
              }
            }}
            title={t("topicSet.inline.clickToRename")}
          >
            {node.data.name}
          </button>
          <div className="flex items-center gap-1">
            {nodeAiState?.overlap && (
              <span
                className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700"
                title={t("topicSet.ai.treeStateOverlap")}
              >
                ⚠
              </span>
            )}
            {nodeAiState?.empty && (
              <span
                className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600"
                title={t("topicSet.ai.treeStateEmpty")}
              >
                ⬜
              </span>
            )}
            {nodeAiState?.hot && (
              <span
                className="rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700"
                title={t("topicSet.ai.treeStateHot")}
              >
                🔥
              </span>
            )}
            {nodeAiState?.uncategorized && (
              <span
                className="rounded-full border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700"
                title={t("topicSet.ai.treeStateUncategorized")}
              >
                ❗
              </span>
            )}
          </div>
          {typeof node.data.topicCount === "number" && node.data.topicCount > 0 && (
            <span
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
              title={`${t("topicSet.tree.boundTopics")}: ${node.data.topicCount}`}
            >
              {node.data.topicCount}
            </span>
          )}
          {node.data.topicCount === 0 && !node.data.hasChildren && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
              {t("topicSet.tree.emptyCategory")}
            </span>
          )}
          {node.willReceiveDrop && node.isInternal && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800">
              {t("topicSet.tree.dropHere")}
            </span>
          )}
          <div className={cn("ml-auto flex items-center gap-1", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            {(node.data.topicCount ?? 0) > 0 && (
              <button
                type="button"
                className="rounded border p-0.5"
                title={t("topicSet.tree.impact")}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenImpact?.(node.id);
                }}
                onMouseEnter={() => {
                  onPrefetchImpact?.(node.id);
                }}
              >
                <BarChart3 className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              className="rounded border p-0.5"
              title={t("topicSet.menu.addChild")}
              onClick={(event) => {
                event.stopPropagation();
                onStartCreate(node.id);
                if (onExpandNode) {
                  onExpandNode(node.id);
                }
                if (node.isInternal && !node.isOpen) {
                  node.open();
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="rounded border p-0.5"
              title={t("topicSet.menu.more")}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
                onContextMenu(node.id, rect.left, rect.bottom);
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TaxonomyTree({
  nodes,
  nodeMap,
  childrenByParent,
  rootNodeIds,
  selectedNodeId,
  dragDisabled,
  creatingParentId,
  creatingName,
  creatingLoading,
  renamingNodeId,
  renamingName,
  renamingLoading,
  onSelect,
  onExpandNode,
  onContextMenu,
  onOpenImpact,
  onPrefetchImpact,
  onMoveByDrag,
  onStartCreate,
  onChangeCreatingName,
  onConfirmCreate,
  onCancelCreate,
  onStartRename,
  onChangeRenamingName,
  onConfirmRename,
  onCancelRename,
  canRenameInline = true,
  maxDocCount = 0,
  aiSuggestionOpen = false,
  aiSuggestionGroups = [],
  onToggleAiSuggestion,
  onApplyAiSuggestion,
  onCompareAiSuggestion,
  aiNodeStateMap,
}: TaxonomyTreeProps) {
  const fallbackCache = useMemo(() => buildCacheFromNested(nodes), [nodes]);

  const resolvedNodeMap = nodeMap ?? fallbackCache.nodeMap;
  const resolvedChildrenByParent = childrenByParent ?? fallbackCache.childrenByParent;
  const resolvedRootNodeIds = rootNodeIds ?? fallbackCache.rootNodeIds;
  const allLoadedParentIds = useMemo(
    () => new Set<string>(Object.keys(resolvedChildrenByParent)),
    [resolvedChildrenByParent]
  );

  const rootSignature = useMemo(() => resolvedRootNodeIds.join("|"), [resolvedRootNodeIds]);
  const [loadedParentIds, setLoadedParentIds] = useState<Set<string>>(allLoadedParentIds);

  useEffect(() => {
    setLoadedParentIds(new Set(allLoadedParentIds));
  }, [allLoadedParentIds, rootSignature]);

  const nodeDataMap = useMemo(() => {
    const map: Record<string, TreeNodeData> = {};
    for (const [id, item] of Object.entries(resolvedNodeMap)) {
      map[id] = {
        id,
        name: item.name,
        path: item.path,
        hasChildren: (resolvedChildrenByParent[id]?.length ?? 0) > 0,
        topicCount: item.topicCount,
        docCount: item.docCount,
        kind: "node",
      };
    }
    return map;
  }, [resolvedNodeMap, resolvedChildrenByParent]);

  const rootData = useMemo(
    () => resolvedRootNodeIds.map((id) => nodeDataMap[id]).filter(Boolean),
    [nodeDataMap, resolvedRootNodeIds]
  );

  const getChildren = (item: TreeNodeData): readonly TreeNodeData[] | null => {
    if (item.kind === "create-draft") return null;
    const isCreatingHere = creatingParentId === item.id;
    if (!item.hasChildren && !isCreatingHere) return null;
    if (!loadedParentIds.has(item.id)) return [];
    const ids = resolvedChildrenByParent[item.id] ?? [];
    const children = ids.map((id) => nodeDataMap[id]).filter(Boolean);
    if (isCreatingHere) {
      children.push({
        id: `__create__:${item.id}`,
        name: "",
        path: "",
        hasChildren: false,
        kind: "create-draft",
        parentId: item.id,
      });
    }
    return children;
  };

  useEffect(() => {
    if (!creatingParentId) return;
    setLoadedParentIds((prev) => {
      if (prev.has(creatingParentId)) return prev;
      const next = new Set(prev);
      next.add(creatingParentId);
      return next;
    });
  }, [creatingParentId]);

  return (
    <section className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("topicSet.tree.title")}</h2>
          <button
            type="button"
            className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-xs text-fuchsia-700"
            onClick={onToggleAiSuggestion}
          >
            {t("topicSet.ai.treeSuggestion")}
          </button>
        </div>
        {aiSuggestionOpen && aiSuggestionGroups.length > 0 && (
          <div className="mt-3 rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 p-3 text-xs">
            <div className="font-medium text-fuchsia-800">{t("topicSet.ai.treeSuggestionPending")}</div>
            <div className="mt-2 space-y-2">
              {aiSuggestionGroups.map((group) => (
                <div key={group.title}>
                  <div className="font-medium text-slate-900">{group.title}</div>
                  <ul className="mt-1 space-y-1 text-slate-700">
                    {group.items.map((item) => (
                      <li key={`${group.title}-${item}`}>- {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-black px-2.5 py-1 text-xs text-white"
                onClick={onApplyAiSuggestion}
              >
                {t("topicSet.ai.apply")}
              </button>
              <button
                type="button"
                className="rounded-md border bg-white px-2.5 py-1 text-xs"
                onClick={onCompareAiSuggestion}
              >
                {t("topicSet.ai.compareCurrent")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="max-h-[68vh] overflow-auto p-2 scrollbar-thin">
        {creatingParentId === null && (
          <InlineCreateRootRow
            value={creatingName}
            loading={creatingLoading}
            onChange={onChangeCreatingName}
            onConfirm={onConfirmCreate}
            onCancel={onCancelCreate}
          />
        )}

        {rootData.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            {t("topicSet.tree.empty")}
          </div>
        ) : (
          <Tree<TreeNodeData>
            key={`tree:${rootSignature}:${creatingParentId ?? "none"}`}
            data={rootData}
            idAccessor="id"
            childrenAccessor={getChildren}
            width="100%"
            height={560}
            rowHeight={40}
            indent={16}
            openByDefault
            initialOpenState={
              creatingParentId ? { [creatingParentId]: true } : undefined
            }
            overscanCount={12}
            renderCursor={DropCursor}
            disableDrag={Boolean(dragDisabled)}
            selection={selectedNodeId ?? undefined}
            onToggle={(id) => {
              setLoadedParentIds((prev) => {
                if (prev.has(id)) return prev;
                const next = new Set(prev);
                next.add(id);
                return next;
              });
              if (onExpandNode) {
                onExpandNode(id);
              }
            }}
            onSelect={(selected) => {
              const target = selected[0];
              if (target?.data.kind === "create-draft") return;
              if (target) onSelect(target.id);
            }}
            onMove={({ dragIds, parentId, index }) => {
              if (dragDisabled) return;
              const sourceNodeId = dragIds[0];
              if (!sourceNodeId || !parentId || sourceNodeId === parentId) return;
              onMoveByDrag({
                sourceNodeId,
                newParentId: parentId,
                index,
              });
            }}
          >
            {(props) => (
              <ArborNode
                {...props}
                selectedNodeId={selectedNodeId}
                creatingParentId={creatingParentId}
                creatingName={creatingName}
                creatingLoading={creatingLoading}
                renamingNodeId={renamingNodeId}
                renamingName={renamingName}
                renamingLoading={renamingLoading}
                onSelect={onSelect}
                onExpandNode={onExpandNode}
                onContextMenu={onContextMenu}
                onOpenImpact={onOpenImpact}
                onPrefetchImpact={onPrefetchImpact}
                onStartCreate={onStartCreate}
                onChangeCreatingName={onChangeCreatingName}
                onConfirmCreate={onConfirmCreate}
                onCancelCreate={onCancelCreate}
                onStartRename={onStartRename}
                onChangeRenamingName={onChangeRenamingName}
                onConfirmRename={onConfirmRename}
                onCancelRename={onCancelRename}
                canRenameInline={canRenameInline}
                maxDocCount={maxDocCount}
                aiNodeStateMap={aiNodeStateMap}
              />
            )}
          </Tree>
        )}
      </div>
    </section>
  );
}
