import { t } from "@/i18n";
import { useEffect, useMemo, useState } from "react";
import { searchGlossaryConceptsPaged, type GlossaryGraphResult } from "@/lib/glossary-api";
import type { SelectedTerm, TermSearchResult } from "./term-selector-types";
import { useDraggableDialog } from "@/lib/useDraggableDialog";
import { SearchLoadingIndicator } from "@/components/ui/search-loading-indicator";

export function TermSelectorModal({
  open,
  onClose,
  onConfirm,
  initialSelected = [],
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (terms: SelectedTerm[]) => void;
  initialSelected?: SelectedTerm[];
}) {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<TermSearchResult[]>([]);
  const [selected, setSelected] = useState<Record<string, SelectedTerm>>({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const draggable = useDraggableDialog(open);

  const allCategory = t("ruleEditor.termSelector.category.all");

  useEffect(() => {
    if (!open) return;
    const map: Record<string, SelectedTerm> = {};
    initialSelected.forEach((item) => {
      map[item.conceptId] = item;
    });
    setSelected(map);
    setKeyword("");
    setResults([]);
    setSearchError(null);
    setPage(1);
    setHasMore(false);
    setActiveCategory(allCategory);
  }, [open, initialSelected, allCategory]);

  useEffect(() => {
    if (!open) return;
    const q = keyword.trim();
    if (!q) {
      setLoading(false);
      setResults([]);
      setHasMore(false);
      setSearchError(null);
      return;
    }
    setLoading(true);
    setSearchError(null);
    const timer = setTimeout(() => {
      searchGlossaryConceptsPaged({
        query: q,
        limit: 12,
        offset: (page - 1) * 12,
      })
        .then((data) => {
          const mapped = data.items.map(mapResult);
          setResults(mapped);
          setHasMore(data.hasMore);
        })
        .catch((error: unknown) => {
          setResults([]);
          setHasMore(false);
          setSearchError(
            error instanceof Error
              ? error.message
              : t("ruleEditor.termSelector.searchFailed")
          );
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
    };
  }, [open, keyword, page]);

  const categories = useMemo(() => buildCategories(results, allCategory), [results, allCategory]);
  const visibleResults =
    activeCategory === allCategory
      ? results
      : results.filter((item) => (item.tags ?? []).includes(activeCategory));
  const selectedList = Object.values(selected);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        className="flex h-[70vh] max-h-[70vh] w-full min-h-0 flex-col bg-white shadow-2xl sm:max-w-[96vw] sm:rounded-lg lg:w-[1180px]"
        style={draggable.style}
      >
        <div className={`select-none border-b p-3 sm:p-4 ${draggable.dragging ? "cursor-grabbing" : "cursor-grab"}`} {...draggable.handleProps}>
          <div className="text-lg font-semibold">{t("ruleEditor.termSelector.title")}</div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder={t("ruleEditor.termSelector.searchPlaceholder")}
              className="h-9 flex-1 rounded border px-3 text-sm"
            />
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 sm:w-auto"
              onClick={() => setPage(1)}
            >
              {t("drawer.search")}
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[220px_1fr_320px]">
          <div className="max-h-40 overflow-auto rounded border p-2 lg:max-h-none">
            <div className="mb-2 text-xs text-slate-500">{t("ruleEditor.termSelector.category.title")}</div>
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`mb-1 w-full rounded px-2 py-1 text-left text-sm ${
                  activeCategory === item ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
                }`}
                onClick={() => setActiveCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="min-h-0 overflow-auto rounded border p-2">
            {loading && (
              <SearchLoadingIndicator
                text={t("ruleEditor.termSelector.searching")}
                className="mb-2"
              />
            )}
            {searchError && (
              <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {searchError}
              </div>
            )}
            {!loading && !searchError && visibleResults.length === 0 && (
              <div className="text-xs text-slate-500">{t("ruleEditor.termSelector.noResult")}</div>
            )}
            <div className="space-y-2">
              {visibleResults.map((term) => {
                const checked = Boolean(selected[term.id]);
                return (
                  <label key={term.id} className="block rounded border p-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-medium">{term.name}</div>
                        {term.definition && <div className="text-xs text-slate-500">{term.definition}</div>}
                        <div className="text-xs text-slate-500">
                          {term.parentName
                            ? t("ruleEditor.termSelector.parent", { name: term.parentName })
                            : t("ruleEditor.termSelector.parentEmpty")}
                          {typeof term.childCount === "number"
                            ? t("ruleEditor.termSelector.children", { count: term.childCount })
                            : ""}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setSelected((prev) => {
                            const next = { ...prev };
                            if (e.target.checked) {
                              next[term.id] = {
                                conceptId: term.id,
                                conceptName: term.name,
                                includeDescendants: false,
                              };
                            } else {
                              delete next[term.id];
                            }
                            return next;
                          });
                        }}
                      />
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                {t("glossary.common.prev")}
              </button>
              <span>{t("ruleEditor.termSelector.page", { page })}</span>
              <button
                type="button"
                className="rounded border px-2 py-1 disabled:opacity-50"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("glossary.common.next")}
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded border p-3">
            <div className="mb-2 font-medium">{t("ruleEditor.termSelector.selectedTitle", { count: selectedList.length })}</div>
            <div className="space-y-2">
              {selectedList.length === 0 && <div className="text-xs text-slate-500">{t("ruleEditor.termSelector.selectedEmpty")}</div>}
              {selectedList.map((term) => (
                <div key={term.conceptId} className="rounded border p-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{term.conceptName}</span>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = { ...prev };
                          delete next[term.conceptId];
                          return next;
                        })
                      }
                    >
                      {t("ruleEditor.termSelector.remove")}
                    </button>
                  </div>
                  <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={term.includeDescendants}
                      onChange={() =>
                        setSelected((prev) => ({
                          ...prev,
                          [term.conceptId]: {
                            ...prev[term.conceptId],
                            includeDescendants: !prev[term.conceptId].includeDescendants,
                          },
                        }))
                      }
                    />
                    {t("ruleEditor.termSelector.includeDescendants")}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t p-3 sm:p-4">
          <button type="button" className="rounded border px-3 py-1.5 text-sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onConfirm(Object.values(selected))}
            disabled={selectedList.length === 0}
          >
            {t("ruleEditor.termSelector.confirm", { count: selectedList.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

function mapResult(item: GlossaryGraphResult): TermSearchResult {
  const nodeMap = new Map<number, string>();
  item.nodes.forEach((node) => nodeMap.set(node.id, node.canonical));
  const parent = item.edges.find((edge) => edge.direction === "INCOMING");
  const childCount = item.edges.filter((edge) => edge.direction === "OUTGOING").length;
  const tags: string[] = [];
  if (parent) tags.push(nodeMap.get(parent.source) ?? t("ruleEditor.termSelector.parentTag"));
  if (childCount > 0) tags.push(t("ruleEditor.termSelector.expandableTag"));
  return {
    id: String(item.center.id),
    name: item.center.canonical,
    definition: undefined,
    parentName: parent ? nodeMap.get(parent.source) : undefined,
    childCount,
    hasChildren: childCount > 0,
    tags,
  };
}

function buildCategories(results: TermSearchResult[], allCategory: string) {
  const set = new Set<string>([allCategory]);
  results.forEach((item) => {
    (item.tags ?? []).forEach((tag) => set.add(tag));
  });
  return Array.from(set);
}
