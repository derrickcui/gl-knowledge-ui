"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchGlossaryConcept,
  GlossaryConceptDetail,
  GlossaryGraphResult,
  searchGlossaryConcepts,
} from "@/lib/glossary-api";
import { ConceptConditionDraft } from "./conceptConditionDraft";

type RelationMode = "SELF" | "DESCENDANT" | "SUBSET";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: ConceptConditionDraft) => void;
  initialQuery?: string;
  initialDraft?: ConceptConditionDraft | null;
}

export default function ConceptPickerModal({
  open,
  onClose,
  onConfirm,
  initialQuery = "",
  initialDraft = null,
}: Props) {
  const initialConceptId = initialDraft?.concept.id ?? null;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GlossaryGraphResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GlossaryGraphResult | null>(null);
  const [detail, setDetail] = useState<GlossaryConceptDetail | null>(null);
  const [relationMode, setRelationMode] =
    useState<RelationMode>("DESCENDANT");
  const [selectedChildren, setSelectedChildren] = useState<Set<number>>(
    new Set()
  );
  const [location, setLocation] = useState({
    inBody: true,
    inTitle: false,
    inParagraph: false,
    inSentence: false,
  });

  function normalizeLocation(loc?: {
    inBody: boolean;
    inTitle: boolean;
    inParagraph: boolean;
    inSentence: boolean;
  }) {
    if (!loc) {
      return {
        inBody: true,
        inTitle: false,
        inParagraph: false,
        inSentence: false,
      };
    }
    if (loc.inParagraph) {
      return {
        inBody: false,
        inTitle: false,
        inParagraph: true,
        inSentence: false,
      };
    }
    if (loc.inSentence) {
      return {
        inBody: false,
        inTitle: false,
        inParagraph: false,
        inSentence: true,
      };
    }
    if (loc.inTitle) {
      return {
        inBody: false,
        inTitle: true,
        inParagraph: false,
        inSentence: false,
      };
    }
    return {
      inBody: true,
      inTitle: false,
      inParagraph: false,
      inSentence: false,
    };
  }

  function setExclusiveLocation(
    key: "inBody" | "inTitle" | "inParagraph" | "inSentence"
  ) {
    setLocation({
      inBody: key === "inBody",
      inTitle: key === "inTitle",
      inParagraph: key === "inParagraph",
      inSentence: key === "inSentence",
    });
  }

  useEffect(() => {
    if (!open) return;
    const nextQuery = initialDraft?.concept.name ?? initialQuery;
    setQuery(nextQuery);
    setResults([]);
    if (initialDraft?.concept.id) {
      setSelected({
        center: {
          id: Number(initialDraft.concept.id),
          canonical: initialDraft.concept.name,
          version: initialDraft.concept.version,
        },
        nodes: [
          {
            id: Number(initialDraft.concept.id),
            canonical: initialDraft.concept.name,
            version: initialDraft.concept.version,
            type: "CONCEPT",
            isCenter: true,
          },
        ],
        edges: [],
        meta: {
          depth: 0,
          nodeCount: 1,
          edgeCount: 0,
          truncated: false,
          expandable: true,
        },
      });
    } else {
      setSelected(null);
    }
    setDetail(null);
    setRelationMode(
      initialDraft?.scope.mode === "PARTIAL_DESCENDANT"
        ? "SUBSET"
        : initialDraft?.scope.mode ?? "DESCENDANT"
    );
    setSelectedChildren(
      new Set(initialDraft?.scope.selectedChildIds?.map(Number) ?? [])
    );
    setLocation(normalizeLocation(initialDraft?.location));
    if (nextQuery.trim()) {
      setLoading(true);
      searchGlossaryConcepts(nextQuery.trim())
        .then((data) => {
          if (initialConceptId) {
            const idx = data.findIndex(
              (item) => String(item.center.id) === initialConceptId
            );
            if (idx > 0) {
              const hit = data[idx];
              const rest = data.filter((_, i) => i !== idx);
              setResults([hit, ...rest]);
              return;
            }
          }
          setResults(data);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }
  }, [open, initialQuery, initialDraft, initialConceptId]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setLoading(true);
      searchGlossaryConcepts(trimmed)
        .then((data) => setResults(data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [open, query]);

  useEffect(() => {
    if (!open || !initialDraft) return;
    const hit = results.find(
      (item) => String(item.center.id) === initialDraft.concept.id
    );
    if (hit) {
      setSelected(hit);
    }
  }, [open, initialDraft, results]);

  useEffect(() => {
    if (!selected) return;
    fetchGlossaryConcept(selected.center.id)
      .then((data) => {
        setDetail(data);
        if (initialDraft && !initialDraft.concept.name && data?.canonical) {
          setSelected((prev) =>
            prev
              ? {
                  ...prev,
                  center: {
                    ...prev.center,
                    canonical: data.canonical,
                  },
                  nodes: prev.nodes?.map((node) =>
                    node.id === prev.center.id
                      ? { ...node, canonical: data.canonical }
                      : node
                  ),
                }
              : prev
          );
          if (!query.trim()) {
            setQuery(data.canonical);
          }
        }
      })
      .catch(() => setDetail(null));
  }, [selected, initialDraft, query]);

  const nodeMap = useMemo(() => {
    const map = new Map<number, string>();
    selected?.nodes?.forEach((node) => {
      map.set(node.id, node.canonical);
    });
    return map;
  }, [selected]);

  const { parentNames, childNames, childIds } = useMemo(() => {
    const parents: string[] = [];
    const children: string[] = [];
    const childrenIds: number[] = [];
    selected?.edges?.forEach((edge) => {
      if (edge.direction === "INCOMING") {
        const name = nodeMap.get(edge.source);
        if (name) parents.push(name);
      }
      if (edge.direction === "OUTGOING") {
        const name = nodeMap.get(edge.target);
        if (name) children.push(name);
        childrenIds.push(edge.target);
      }
    });
    return {
      parentNames: parents,
      childNames: children,
      childIds: childrenIds,
    };
  }, [selected, nodeMap]);

  const canConfirm =
    !!selected && (relationMode !== "SUBSET" || selectedChildren.size > 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[720px] max-h-[90vh] w-[960px] max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">添加业务概念条件</div>
            <div className="text-xs text-slate-500">
              选择一个业务概念，并定义它在规则中的匹配方式
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        <div className="mt-4 grid flex-1 min-h-0 gap-4 lg:grid-cols-[320px_1fr_1fr]">
          <div className="min-h-0 space-y-3 overflow-auto border-r pr-4">
            <div className="text-sm font-semibold">搜索业务概念</div>
            <input
              type="text"
              className="h-9 w-full rounded-md border px-3 text-sm"
              placeholder="搜索业务概念（如：博士后、人才补贴）"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {loading && (
              <div className="text-xs text-slate-500">搜索中…</div>
            )}
            {!loading && results.length === 0 && query.trim() && (
              <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">
                未找到匹配概念
              </div>
            )}
            <div className="space-y-2">
              {results.map((result) => {
                const parents = getParentNames(result);
                const children = getChildNames(result);
                const isSelected =
                  selected?.center.id === result.center.id;
                return (
                  <button
                    key={result.center.id}
                    type="button"
                    className={`w-full rounded-md border p-3 text-left text-sm ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setSelected(result);
                      setSelectedChildren(new Set());
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {result.center.canonical}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                        已发布
                      </span>
                    </div>
                    {isSelected && detail?.definition && (
                      <div className="mt-1 text-xs text-slate-600">
                        定义：{detail.definition}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-slate-500">
                      上位：{parents.length ? parents.join(" / ") : "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      下位：{children.length ? children.join(" / ") : "—"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded-md border p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">
                请选择一个概念查看详情
              </div>
            ) : (
              <div className="flex h-full flex-col space-y-4">
                <div>
                  <div className="text-sm font-semibold">已选业务概念</div>
                  <div className="text-sm font-semibold">
                    {selected.center.canonical}
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    定义：{detail?.definition ?? "暂无定义"}
                  </div>
                  {detail?.aliases && detail.aliases.length > 1 && (
                    <div className="mt-1 text-xs text-slate-500">
                      别名：{detail.aliases.join(" / ")}
                    </div>
                  )}
                  {detail?.evidence && detail.evidence.length > 0 && (
                    <div className="mt-1 text-xs text-slate-500">
                      证据：{detail.evidence.length} 条
                    </div>
                  )}
                  <div className="mt-2 text-xs text-slate-500">
                    上位概念：
                    {parentNames.length ? parentNames.join(" / ") : "—"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    下位概念：
                    {childNames.length ? childNames.join(" / ") : "—"}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-end gap-2">
                  <div className="text-xs text-slate-500">
                    仅用于确认选择是否正确
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-auto rounded-md border p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">
                请选择概念后配置规则条件
              </div>
            ) : (
              <div className="flex min-h-0 flex-col space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="font-medium">概念匹配范围</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="relation"
                      checked={relationMode === "SELF"}
                      onChange={() => setRelationMode("SELF")}
                    />
                    仅匹配该概念
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="relation"
                      checked={relationMode === "DESCENDANT"}
                      onChange={() => setRelationMode("DESCENDANT")}
                    />
                    包含所有下位概念（推荐）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="relation"
                      checked={relationMode === "SUBSET"}
                      onChange={() => setRelationMode("SUBSET")}
                    />
                    选择部分下位概念
                  </label>
                </div>

                {relationMode === "SUBSET" && (
                  <div className="rounded-md border border-dashed p-3 text-xs text-slate-600">
                    {childIds.length === 0 ? (
                      <div>该概念暂无下位概念</div>
                    ) : (
                      <div className="max-h-[120px] space-y-2 overflow-auto">
                        {childIds.map((id) => (
                          <label key={id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedChildren.has(id)}
                              onChange={() => {
                                setSelectedChildren((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(id)) {
                                    next.delete(id);
                                  } else {
                                    next.add(id);
                                  }
                                  return next;
                                });
                              }}
                            />
                            {nodeMap.get(id) ?? id}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="font-medium">内容出现的位置</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="concept-location"
                      checked={location.inBody}
                      onChange={() => setExclusiveLocation("inBody")}
                    />
                    出现在文档正文中（默认）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="concept-location"
                      checked={location.inTitle}
                      onChange={() => setExclusiveLocation("inTitle")}
                    />
                    出现在标题中（高级）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="concept-location"
                      checked={location.inParagraph}
                      onChange={() => setExclusiveLocation("inParagraph")}
                    />
                    出现在同一段落中（高级）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="concept-location"
                      checked={location.inSentence}
                      onChange={() => setExclusiveLocation("inSentence")}
                    />
                    出现在同一句话中（高级）
                  </label>
                </div>

                <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-800">
                  <div className="text-xs font-medium text-slate-500">
                    规则含义预览
                  </div>
                  <div className="mt-2">
                    {buildExplainMini({
                      conceptName: selected.center.canonical,
                      relation: relationMode,
                      location,
                      selectedChildNames: Array.from(selectedChildren).map(
                        (id) => nodeMap.get(id) ?? String(id)
                      ),
                    })}
                  </div>
                </div>

                <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 bg-white pt-3">
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-sm"
                    onClick={onClose}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                    disabled={!canConfirm}
                    onClick={() => {
                      if (!selected) return;
                      const errors: string[] = [];
                      if (
                        !location.inBody &&
                        !location.inTitle &&
                        !location.inParagraph &&
                        !location.inSentence
                      ) {
                        errors.push(
                          "请至少选择一个内容出现位置（建议保留“正文”）。"
                        );
                      }
                      if (
                        relationMode === "SUBSET" &&
                        selectedChildren.size === 0
                      ) {
                        errors.push(
                          "你选择了“部分下位概念”，但尚未选择任何下位概念。"
                        );
                      }
                      const draft: ConceptConditionDraft = {
                        concept: {
                          id: String(selected.center.id),
                          name: selected.center.canonical,
                          definition: detail?.definition ?? undefined,
                          version: selected.center.version,
                          hasChildren: childIds.length > 0,
                        },
                        scope: {
                          mode:
                            relationMode === "SUBSET"
                              ? "PARTIAL_DESCENDANT"
                              : relationMode,
                          selectedChildIds:
                            relationMode === "SUBSET"
                              ? Array.from(selectedChildren).map(String)
                              : [],
                          selectedChildNames:
                            relationMode === "SUBSET"
                              ? Array.from(selectedChildren).map(
                                  (id) => nodeMap.get(id) ?? String(id)
                                )
                              : [],
                        },
                        location,
                        explainPreview: buildExplainMini({
                          conceptName: selected.center.canonical,
                          relation: relationMode,
                          location,
                          selectedChildNames: Array.from(selectedChildren).map(
                            (id) => nodeMap.get(id) ?? String(id)
                          ),
                        }),
                        validation: {
                          valid: errors.length === 0,
                          errors,
                        },
                      };
                      if (!draft.validation.valid) return;
                      onConfirm(draft);
                    }}
                  >
                    添加到规则
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getParentNames(result: GlossaryGraphResult) {
  const map = new Map<number, string>();
  result.nodes?.forEach((node) => {
    map.set(node.id, node.canonical);
  });
  return result.edges
    .filter((edge) => edge.direction === "INCOMING")
    .map((edge) => map.get(edge.source))
    .filter(Boolean) as string[];
}

function getChildNames(result: GlossaryGraphResult) {
  const map = new Map<number, string>();
  result.nodes?.forEach((node) => {
    map.set(node.id, node.canonical);
  });
  return result.edges
    .filter((edge) => edge.direction === "OUTGOING")
    .map((edge) => map.get(edge.target))
    .filter(Boolean) as string[];
}

function buildExplainMini({
  conceptName,
  relation,
  location,
  selectedChildNames = [],
}: {
  conceptName: string;
  relation: RelationMode;
  location: {
    inBody: boolean;
    inTitle: boolean;
    inParagraph: boolean;
    inSentence: boolean;
  };
  selectedChildNames?: string[];
}) {
  const parts: string[] = [];
  if (location.inBody) parts.push("正文");
  if (location.inTitle) parts.push("标题");
  if (location.inParagraph) parts.push("同一段落");
  if (location.inSentence) parts.push("同一句话");
  const loc = parts.length ? `文档${parts.join(" / ")}` : "文档内容";
  let scope = "仅该概念";
  if (relation === "DESCENDANT") {
    scope = "该概念及其下位概念";
  } else if (relation === "SUBSET") {
    scope = selectedChildNames.length
      ? `该概念及选中的下位概念：${selectedChildNames.join(" / ")}`
      : "该概念及选中的下位概念";
  }
  return `当【${loc}】中提到「${conceptName}」（${scope}）时，该规则条件成立。`;
}
