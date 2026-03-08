import { create } from "zustand";
import { searchTopics, TopicDTO } from "@/lib/topic-api";
import {
  NodeTopicView,
  TopicSetValidationDetails,
  TopicSetDetail,
  TopicSetNode,
  TopicSetNodeItem,
  TopicSetSummary,
  TopicSetVersionItem,
  bindTopicToNode,
  createTopicSetNode,
  deleteTopicSetNode,
  getTopicSet,
  getTopicSetTree,
  getTopicSetVersionTree,
  listTopicSetNodeTopics,
  listTopicSetNodes,
  listTopicSetVersionNodes,
  listTopicSetVersions,
  listTopicSets,
  moveTopicSetNode,
  publishTopicSet,
  unbindTopicFromNode,
  updateTopicSetNode,
} from "@/lib/topicset-api";

function toLegacyNode(item: TopicSetNodeItem): TopicSetNode {
  return {
    id: item.id,
    parentId: item.parentId ?? null,
    name: item.name,
    path: item.path,
    depth: item.depth,
    hasChildren: item.hasChildren,
    childCount: item.childCount,
    topicCount: item.topicCount,
    docCount: item.docCount,
    children: [],
  };
}

function flattenTree(nodes: TopicSetNode[]): TopicSetNode[] {
  const queue = [...nodes];
  const list: TopicSetNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    list.push(current);
    if (current.children.length > 0) {
      queue.unshift(...current.children);
    }
  }
  return list;
}

function findParentKey(childrenByParent: Record<string, string[]>, nodeId: string): string | null {
  for (const [key, children] of Object.entries(childrenByParent)) {
    if (children.includes(nodeId)) return key;
  }
  return null;
}

function applyOptimisticMove(
  childrenByParent: Record<string, string[]>,
  sourceNodeId: string,
  newParentId: string,
  index?: number | null
): Record<string, string[]> {
  const nextChildrenByParent: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(childrenByParent)) {
    nextChildrenByParent[key] = [...value];
  }

  const sourceParentKey = findParentKey(nextChildrenByParent, sourceNodeId);
  if (!sourceParentKey) return childrenByParent;

  nextChildrenByParent[sourceParentKey] = nextChildrenByParent[sourceParentKey].filter((id) => id !== sourceNodeId);

  if (!nextChildrenByParent[newParentId]) {
    nextChildrenByParent[newParentId] = [];
  }

  const targetList = nextChildrenByParent[newParentId];
  const normalizedIndex =
    index == null
      ? targetList.length
      : Math.max(0, Math.min(index, targetList.length));
  targetList.splice(normalizedIndex, 0, sourceNodeId);

  return nextChildrenByParent;
}

type TopicSetStoreState = {
  topicSets: TopicSetSummary[];
  topicSetId: string | null;
  topicSetDetail: TopicSetDetail | null;
  topicSetEtag: string | null;
  nodes: TopicSetNode[];
  nodeMap: Record<string, TopicSetNode>;
  childrenByParent: Record<string, string[]>;
  rootNodeIds: string[];
  loadedChildrenParents: Record<string, boolean>;
  selectedNode: string | null;
  topics: Record<string, NodeTopicView[]>;
  topicsLoaded: Record<string, boolean>;
  version: number | null;
  versions: TopicSetVersionItem[];
  loading: boolean;
  error: string | null;
};

type TopicSetStoreActions = {
  initialize: () => Promise<void>;
  setTopicSet: (topicSetId: string) => Promise<void>;
  refreshTopicSetMeta: () => Promise<{ ok: boolean; error?: string; etag?: string | null }>;
  setVersion: (version: number | null) => Promise<void>;
  loadTree: () => Promise<void>;
  loadChildren: (parentId: string | null) => Promise<{ ok: boolean; error?: string }>;
  loadNodeTopics: (nodeId: string, force?: boolean) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  createNode: (payload: {
    parentId?: string | null;
    name: string;
    description?: string | null;
  }) => Promise<{ ok: boolean; error?: string; nodeId?: string; status?: number }>;
  renameNode: (nodeId: string, payload: { name: string; description?: string | null }) => Promise<{
    ok: boolean;
    error?: string;
    status?: number;
  }>;
  deleteNode: (nodeId: string) => Promise<{ ok: boolean; error?: string; status?: number }>;
  moveNode: (
    nodeId: string,
    parentId: string,
    index?: number | null
  ) => Promise<{ ok: boolean; error?: string; status?: number }>;
  bindTopic: (nodeId: string, topicId: string) => Promise<{ ok: boolean; error?: string; status?: number }>;
  unbindTopic: (nodeId: string, topicId: string) => Promise<{ ok: boolean; error?: string; status?: number }>;
  publish: (comment?: string) => Promise<{
    ok: boolean;
    error?: string;
    version?: number;
    errorDetails?: TopicSetValidationDetails | null;
    status?: number;
  }>;
  searchTopic: (keyword: string) => Promise<TopicDTO[]>;
  findNodeById: (nodeId: string | null) => TopicSetNode | null;
};

export const useTopicSetStore = create<TopicSetStoreState & TopicSetStoreActions>((set, get) => ({
  topicSets: [],
  topicSetId: null,
  topicSetDetail: null,
  topicSetEtag: null,
  nodes: [],
  nodeMap: {},
  childrenByParent: {},
  rootNodeIds: [],
  loadedChildrenParents: {},
  selectedNode: null,
  topics: {},
  topicsLoaded: {},
  version: null,
  versions: [],
  loading: false,
  error: null,

  initialize: async () => {
    set({ loading: true, error: null });
    const listResult = await listTopicSets();
    if (!listResult.data) {
      set({
        loading: false,
        error: listResult.error ?? "Unable to load TopicSet list.",
      });
      return;
    }
    const firstId = listResult.data[0]?.id ?? null;
    set({
      topicSets: listResult.data,
      topicSetId: firstId,
      version: null,
      loading: false,
      error: null,
    });
    if (firstId) {
      await get().setTopicSet(firstId);
    }
  },

  setTopicSet: async (topicSetId: string) => {
    set({ topicSetId, version: null, loading: true, error: null });
    const [detailResult, versionResult] = await Promise.all([
      getTopicSet(topicSetId),
      listTopicSetVersions(topicSetId),
    ]);
    if (!detailResult.data) {
      set({
        loading: false,
        error: detailResult.error ?? "Unable to load TopicSet detail.",
      });
      return;
    }
    set({
      topicSetDetail: detailResult.data,
      topicSetEtag: detailResult.etag ?? null,
      versions: versionResult.data ?? [],
      topics: {},
      topicsLoaded: {},
    });
    await get().loadTree();
    set({ loading: false });
  },

  refreshTopicSetMeta: async () => {
    const { topicSetId } = get();
    if (!topicSetId) {
      return { ok: false, error: "TopicSet is not selected." };
    }
    const [detailResult, versionResult] = await Promise.all([
      getTopicSet(topicSetId),
      listTopicSetVersions(topicSetId),
    ]);
    if (!detailResult.data) {
      return { ok: false, error: detailResult.error ?? "Unable to refresh TopicSet detail." };
    }
    set({
      topicSetDetail: detailResult.data,
      topicSetEtag: detailResult.etag ?? null,
      versions: versionResult.data ?? get().versions,
    });
    return { ok: true, etag: detailResult.etag ?? null };
  },

  setVersion: async (version: number | null) => {
    set({ version, topics: {}, topicsLoaded: {} });
    await get().loadTree();
  },

  loadTree: async () => {
    const { topicSetId, version } = get();
    if (!topicSetId) return;

    const treeResult =
      version == null
        ? await getTopicSetTree(topicSetId)
        : await getTopicSetVersionTree(topicSetId, version);

    if (treeResult.data) {
      const nextNodeMap: Record<string, TopicSetNode> = {};
      const nextChildrenByParent: Record<string, string[]> = {};
      const loadedChildrenParents: Record<string, boolean> = {};
      const rootNodeIds: string[] = [];

      const walk = (list: TopicSetNode[], parentId: string | null) => {
        const key = parentId ?? "__root__";
        nextChildrenByParent[key] = list.map((item) => item.id);
        loadedChildrenParents[key] = true;
        if (parentId == null) {
          rootNodeIds.push(...list.map((item) => item.id));
        }
        for (const node of list) {
          const previousNode = get().nodeMap[node.id];
          nextNodeMap[node.id] = {
            ...node,
            // Some tree payloads omit parentId; fill it from traversal context.
            parentId: node.parentId ?? previousNode?.parentId ?? parentId,
            topicCount: node.topicCount ?? previousNode?.topicCount,
            hasChildren: node.hasChildren ?? previousNode?.hasChildren,
            childCount: node.childCount ?? previousNode?.childCount,
            docCount: node.docCount ?? previousNode?.docCount,
            depth: node.depth ?? previousNode?.depth,
          };
          walk(node.children ?? [], node.id);
        }
      };
      walk(treeResult.data, null);

      const previousSelected = get().selectedNode;
      const selected =
        (previousSelected && nextNodeMap[previousSelected] ? previousSelected : null) ?? rootNodeIds[0] ?? null;

      set({
        nodes: treeResult.data,
        nodeMap: nextNodeMap,
        childrenByParent: nextChildrenByParent,
        rootNodeIds,
        loadedChildrenParents,
        selectedNode: selected,
        error: null,
      });

      if (selected) {
        await get().loadNodeTopics(selected);
      }

      const rootStatsResult =
        version == null
          ? await listTopicSetNodes({
              topicSetId,
              parentId: null,
              limit: 500,
              includeStats: true,
            })
          : await listTopicSetVersionNodes({
              topicSetId,
              version,
              parentId: null,
              limit: 500,
              includeStats: true,
            });
      if (rootStatsResult.data) {
        const mergedNodeMap = { ...get().nodeMap };
        for (const item of rootStatsResult.data.items) {
          const existing = mergedNodeMap[item.id];
          if (!existing) continue;
          mergedNodeMap[item.id] = {
            ...existing,
            parentId: item.parentId ?? existing.parentId ?? null,
            depth: item.depth,
            hasChildren: item.hasChildren,
            childCount: item.childCount,
            topicCount: item.topicCount,
            docCount: item.docCount,
          };
        }
        set({ nodeMap: mergedNodeMap });
      }
      return;
    }

    const rootResult =
      version == null
        ? await listTopicSetNodes({
            topicSetId,
            parentId: null,
            limit: 500,
            includeStats: true,
          })
        : await listTopicSetVersionNodes({
            topicSetId,
            version,
            parentId: null,
            limit: 500,
            includeStats: true,
          });

    if (!rootResult.data) {
      set({
        nodes: [],
        nodeMap: {},
        childrenByParent: {},
        rootNodeIds: [],
        loadedChildrenParents: {},
        selectedNode: null,
        error: treeResult.error ?? rootResult.error ?? "Unable to load taxonomy tree.",
      });
      return;
    }

    const nextNodeMap: Record<string, TopicSetNode> = {};
    const rootIds = rootResult.data.items.map((item) => item.id);
    for (const item of rootResult.data.items) {
      nextNodeMap[item.id] = toLegacyNode(item);
    }

    const previousSelected = get().selectedNode;
    const selected =
      (previousSelected && nextNodeMap[previousSelected] ? previousSelected : null) ?? rootIds[0] ?? null;

    set({
      nodes: rootResult.data.items.map((item) => toLegacyNode(item)),
      nodeMap: nextNodeMap,
      childrenByParent: { "__root__": rootIds },
      rootNodeIds: rootIds,
      loadedChildrenParents: { "__root__": true },
      selectedNode: selected,
      error: null,
    });

    if (selected) {
      await get().loadNodeTopics(selected);
    }
  },

  loadChildren: async (parentId) => {
    const { topicSetId, version, loadedChildrenParents } = get();
    if (!topicSetId) return { ok: false, error: "TopicSet is not selected." };

    const key = parentId ?? "__root__";
    if (loadedChildrenParents[key]) return { ok: true };

    const result =
      version == null
        ? await listTopicSetNodes({
            topicSetId,
            parentId,
            limit: 500,
            includeStats: true,
          })
        : await listTopicSetVersionNodes({
            topicSetId,
            version,
            parentId,
            limit: 500,
            includeStats: true,
          });

    if (!result.data) {
      return { ok: false, error: result.error ?? "Unable to load child nodes." };
    }

    const nextNodeMap = { ...get().nodeMap };
    for (const item of result.data.items) {
      nextNodeMap[item.id] = toLegacyNode(item);
    }

    const nextChildrenByParent = {
      ...get().childrenByParent,
      [key]: result.data.items.map((item) => item.id),
    };

    set({
      nodeMap: nextNodeMap,
      childrenByParent: nextChildrenByParent,
      loadedChildrenParents: {
        ...get().loadedChildrenParents,
        [key]: true,
      },
      nodes: (get().childrenByParent["__root__"] ?? [])
        .map((id) => nextNodeMap[id])
        .filter(Boolean),
      error: null,
    });

    return { ok: true };
  },

  loadNodeTopics: async (nodeId, force = false) => {
    if (!force && get().topicsLoaded[nodeId]) return;
    const result = await listTopicSetNodeTopics(nodeId);
    const nextTopics = result.data ?? [];
    const currentNode = get().nodeMap[nodeId];
    set({
      topics: {
        ...get().topics,
        [nodeId]: nextTopics,
      },
      topicsLoaded: {
        ...get().topicsLoaded,
        [nodeId]: true,
      },
      nodeMap: currentNode
        ? {
            ...get().nodeMap,
            [nodeId]: {
              ...currentNode,
              topicCount: nextTopics.length,
            },
          }
        : get().nodeMap,
    });
  },

  selectNode: (nodeId) => set({ selectedNode: nodeId }),

  createNode: async (payload) => {
    const { topicSetId, topicSetEtag } = get();
    if (!topicSetId) return { ok: false, error: "TopicSet is not selected." };
    const result = await createTopicSetNode(topicSetId, payload, topicSetEtag);
    if (!result.data) {
      return { ok: false, error: result.error ?? "Unable to create node.", status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    await get().loadTree();
    const parentKey = payload.parentId ?? "__root__";
    if (payload.parentId != null) {
      await get().loadChildren(payload.parentId);
    }
    set({
      selectedNode: result.data.id,
      loadedChildrenParents: {
        ...get().loadedChildrenParents,
        [parentKey]: true,
      },
    });
    return { ok: true, nodeId: result.data.id, status: result.status };
  },

  renameNode: async (nodeId, payload) => {
    const { topicSetEtag } = get();
    const result = await updateTopicSetNode(nodeId, payload, topicSetEtag);
    if (!result.data) {
      return { ok: false, error: result.error ?? "Unable to update node.", status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }

    const current = get().nodeMap[nodeId];
    if (current) {
      set({
        nodeMap: {
          ...get().nodeMap,
          [nodeId]: {
            ...current,
            name: payload.name,
          },
        },
      });
    }

    return { ok: true, status: result.status };
  },

  deleteNode: async (nodeId) => {
    const { topicSetEtag } = get();
    const result = await deleteTopicSetNode(nodeId, true, topicSetEtag);
    if (result.error) {
      return { ok: false, error: result.error, status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    await get().loadTree();
    return { ok: true, status: result.status };
  },

  moveNode: async (nodeId, parentId, index) => {
    const { topicSetEtag } = get();
    const prevChildrenByParent = get().childrenByParent;
    const nextChildrenByParent = applyOptimisticMove(prevChildrenByParent, nodeId, parentId, index ?? null);
    if (nextChildrenByParent !== prevChildrenByParent) {
      set({
        childrenByParent: nextChildrenByParent,
        nodes: (get().rootNodeIds ?? []).map((id) => get().nodeMap[id]).filter(Boolean),
      });
    }

    const result = await moveTopicSetNode(nodeId, {
      newParentId: parentId,
      index: index ?? null,
    }, topicSetEtag);
    if (!result.data) {
      if (nextChildrenByParent !== prevChildrenByParent) {
        set({
          childrenByParent: prevChildrenByParent,
          nodes: (get().rootNodeIds ?? []).map((id) => get().nodeMap[id]).filter(Boolean),
        });
      }
      return { ok: false, error: result.error ?? "Unable to move node.", status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    await get().loadTree();
    return { ok: true, status: result.status };
  },

  bindTopic: async (nodeId, topicId) => {
    const { topicSetEtag } = get();
    const result = await bindTopicToNode(nodeId, topicId, topicSetEtag);
    if (!result.data) {
      return { ok: false, error: result.error ?? "Unable to bind topic.", status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    await get().loadNodeTopics(nodeId, true);
    return { ok: true, status: result.status };
  },

  unbindTopic: async (nodeId, topicId) => {
    const { topicSetEtag } = get();
    const result = await unbindTopicFromNode(nodeId, topicId, topicSetEtag);
    if (result.error) {
      return { ok: false, error: result.error, status: result.status };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    await get().loadNodeTopics(nodeId, true);
    return { ok: true, status: result.status };
  },

  publish: async (comment?: string) => {
    const { topicSetId } = get();
    if (!topicSetId) return { ok: false, error: "TopicSet is not selected." };
    const refreshResult = await get().refreshTopicSetMeta();
    if (!refreshResult.ok) {
      return { ok: false, error: refreshResult.error };
    }
    const topicSetEtag = refreshResult.etag ?? get().topicSetEtag;
    const result = await publishTopicSet(topicSetId, comment, topicSetEtag);
    if (!result.data) {
      return {
        ok: false,
        error: result.error ?? "Unable to publish.",
        errorDetails: result.errorDetails ?? null,
        status: result.status,
      };
    }
    if (result.etag) {
      set({ topicSetEtag: result.etag });
    }
    set({ version: null });
    await get().setTopicSet(topicSetId);
    return { ok: true, version: result.data.version, status: result.status };
  },

  searchTopic: async (keyword: string) => {
    const result = await searchTopics({ status: "PUBLISHED", keyword });
    return result.data ?? [];
  },

  findNodeById: (nodeId) => {
    if (!nodeId) return null;
    return get().nodeMap[nodeId] ?? null;
  },
}));
