"use client";

import { useEffect, useState } from "react";
import { searchTopics, TopicDTO } from "@/lib/topic-api";
import { TopicConditionDraft } from "./topicConditionDraft";
import { decodeUnicodeEscapes } from "@/lib/text-utils";
import { t } from "@/i18n";

type RangeMode = "ORIGINAL" | "ALL" | "LIMITED";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (draft: TopicConditionDraft) => void;
  initialQuery?: string;
  initialDraft?: TopicConditionDraft | null;
  lockTopicSelection?: boolean;
}

function normalizeLocation(loc?: TopicConditionDraft["location"]) {
  if (!loc) {
    return {
      inBody: true,
      inTitle: true,
      inParagraph: false,
      inSentence: false,
    };
  }
  const hasAny = loc.inBody || loc.inTitle || loc.inParagraph || loc.inSentence;
  if (!hasAny) {
    return {
      inBody: true,
      inTitle: true,
      inParagraph: false,
      inSentence: false,
    };
  }
  return {
    inBody: !!loc.inBody,
    inTitle: !!loc.inTitle,
    inParagraph: false,
    inSentence: false,
  };
}

function normalizeRangeMode(
  location: TopicConditionDraft["location"],
  useOriginalRule?: boolean
): RangeMode {
  if (useOriginalRule) return "ORIGINAL";
  return location.inBody && location.inTitle ? "ALL" : "LIMITED";
}

function buildExplainMini({
  topicName,
  location,
  useOriginalRule,
}: {
  topicName: string;
  location: TopicConditionDraft["location"];
  useOriginalRule?: boolean;
}) {
  if (useOriginalRule) {
    return t("topicPicker.explainOriginal", {
      topicName: decodeUnicodeEscapes(topicName),
    });
  }
  const hasBody = !!location.inBody;
  const hasTitle = !!location.inTitle;
  let scopeKey: Parameters<typeof t>[0] = "topicPicker.scope.content";
  if (hasBody && hasTitle) {
    scopeKey = "topicPicker.scope.all";
  } else if (hasTitle) {
    scopeKey = "topicPicker.scope.title";
  } else if (hasBody) {
    scopeKey = "topicPicker.scope.body";
  }
  const safeTopicName = decodeUnicodeEscapes(topicName);
  return t("topicPicker.explain", {
    scope: t(scopeKey),
    topicName: safeTopicName,
  });
}

export default function TopicPickerModal({
  open,
  onClose,
  onConfirm,
  initialQuery = "",
  initialDraft = null,
  lockTopicSelection = false,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [selected, setSelected] = useState<TopicDTO | null>(null);
  const initialUseOriginal =
    initialDraft?.useOriginalRule ?? true;
  const [location, setLocation] = useState(
    initialUseOriginal
      ? {
          inBody: false,
          inTitle: false,
          inParagraph: false,
          inSentence: false,
        }
      : normalizeLocation(initialDraft?.location)
  );
  const [rangeMode, setRangeMode] = useState<RangeMode>(
    normalizeRangeMode(
      normalizeLocation(initialDraft?.location),
      initialUseOriginal
    )
  );
  const [useOriginalRule, setUseOriginalRule] = useState(
    initialUseOriginal
  );
  const normalizedQuery = decodeUnicodeEscapes(query);

  useEffect(() => {
    if (normalizedQuery !== query) {
      setQuery(normalizedQuery);
    }
  }, [normalizedQuery, query]);

  useEffect(() => {
    if (!open) return;
    const nextQuery = initialDraft?.topic.name ?? initialQuery;
    setQuery(decodeUnicodeEscapes(nextQuery));
    const nextUseOriginal =
      initialDraft?.useOriginalRule ?? true;
    setLocation(
      nextUseOriginal
        ? {
            inBody: false,
            inTitle: false,
            inParagraph: false,
            inSentence: false,
          }
        : normalizeLocation(initialDraft?.location)
    );
    setRangeMode(
      normalizeRangeMode(
        normalizeLocation(initialDraft?.location),
        nextUseOriginal
      )
    );
    setUseOriginalRule(nextUseOriginal);
    if (initialDraft?.topic.id) {
      setSelected({
        id: initialDraft.topic.id,
        name: decodeUnicodeEscapes(initialDraft.topic.name),
        status: initialDraft.topic.status ?? "PUBLISHED",
        usedBy: [],
        updatedAt: null,
      });
    } else {
      setSelected(null);
    }
  }, [open, initialQuery, initialDraft]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const trimmed = query.trim();
    setLoading(true);
    const timer = setTimeout(() => {
      searchTopics({
        status: "published",
        keyword: trimmed ? trimmed : undefined,
      })
        .then((result) => {
          if (!active) return;
          const items = result.data ?? [];
          setTopics(items);
          if (initialDraft?.topic.id) {
            const hit = items.find(
              (item) => item.id === initialDraft.topic.id
            );
            if (hit) {
              setSelected(hit);
            }
          }
        })
        .catch(() => {
          if (!active) return;
          setTopics([]);
        })
        .finally(() => {
          if (!active) return;
          setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, query, initialDraft?.topic.id]);

  const canConfirm = !!selected;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[720px] max-h-[90vh] w-[960px] max-w-[95vw] flex-col overflow-hidden rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold">{t("topicPicker.title")}</div>
            <div className="text-xs text-slate-500">
              {t("topicPicker.subtitle")}
            </div>
          </div>
          <button
            type="button"
            className="text-xs text-slate-500 hover:underline"
            onClick={onClose}
          >
            {t("topicPicker.close")}
          </button>
        </div>

        <div className="mt-4 grid flex-1 min-h-0 gap-4 lg:grid-cols-[320px_1fr_1fr]">
          <div className="min-h-0 space-y-3 overflow-auto border-r pr-4">
            <div className="text-sm font-semibold">
              {t("topicPicker.searchTitle")}
            </div>
            <input
              type="text"
              className="h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder={t("topicPicker.searchPlaceholder")}
              value={normalizedQuery}
              disabled={lockTopicSelection}
              onChange={(event) => setQuery(event.target.value)}
            />
            {loading && (
              <div className="text-xs text-slate-500">
                {t("topicPicker.loading")}
              </div>
            )}
            {!loading && query.trim() && topics.length === 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-slate-500">
                {t("topicPicker.noMatch")}
              </div>
            )}
            <div className="space-y-2">
              {topics.map((topic) => {
                const isSelected = selected?.id === topic.id;
                const disabled = lockTopicSelection;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    disabled={disabled}
                    className={`w-full rounded-md border p-3 text-left text-sm ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                    onClick={() => {
                      if (disabled) return;
                      setSelected(topic);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-medium">
                        {"📘"} {topic.name}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                        {t("topicPicker.published")}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t("topicPicker.conditionsCount", { count: "—" })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-h-0 overflow-auto rounded-md border p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">
                {t("topicPicker.selectHint")}
              </div>
            ) : (
              <div className="flex h-full flex-col space-y-3">
                <div className="text-sm font-semibold">
                  {t("topicPicker.selectedTitle")}
                </div>
                <div className="text-sm font-semibold">
                  {"📘"} {selected.name}
                </div>
                <div className="text-xs text-slate-600">
                  {t("topicPicker.selectedDesc")}
                </div>
                <div className="text-xs text-slate-500">
                  {t("topicPicker.readonlyNote")}
                </div>
                <div className="mt-auto text-xs text-slate-500">
                  {t("topicPicker.blackboxNote")}
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 overflow-auto rounded-md border p-4">
            {!selected ? (
              <div className="text-sm text-slate-500">
                {t("topicPicker.rangeHint")}
              </div>
            ) : (
              <div className="flex min-h-0 flex-col space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="font-medium">
                    {t("topicPicker.rangeTitle")}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="topic-range"
                      checked={rangeMode === "ORIGINAL"}
                      onChange={() => {
                        setRangeMode("ORIGINAL");
                        setUseOriginalRule(true);
                        setLocation({
                          inBody: false,
                          inTitle: false,
                          inParagraph: false,
                          inSentence: false,
                        });
                      }}
                    />
                    {t("topicPicker.rangeOriginal")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="topic-range"
                      checked={rangeMode === "ALL"}
                      onChange={() => {
                        setRangeMode("ALL");
                        setUseOriginalRule(false);
                        setLocation({
                          inBody: true,
                          inTitle: true,
                          inParagraph: false,
                          inSentence: false,
                        });
                      }}
                    />
                    {t("topicPicker.rangeAll")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="topic-range"
                      checked={rangeMode === "LIMITED"}
                      onChange={() => {
                        setRangeMode("LIMITED");
                        setUseOriginalRule(false);
                        setLocation({
                          inBody: true,
                          inTitle: false,
                          inParagraph: false,
                          inSentence: false,
                        });
                      }}
                    />
                    {t("topicPicker.rangeLimited")}
                  </label>
                </div>

                {rangeMode === "LIMITED" && !useOriginalRule && (
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="topic-location"
                        checked={location.inTitle}
                        onChange={() =>
                          setLocation({
                            inBody: false,
                            inTitle: true,
                            inParagraph: false,
                            inSentence: false,
                          })
                        }
                      />
                      {t("topicPicker.rangeTitleOnly")}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="topic-location"
                        checked={location.inBody}
                        onChange={() =>
                          setLocation({
                            inBody: true,
                            inTitle: false,
                            inParagraph: false,
                            inSentence: false,
                          })
                        }
                      />
                      {t("topicPicker.rangeBodyOnly")}
                    </label>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  <div className="font-medium">
                    {t("topicPicker.versionTitle")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t("topicPicker.versionCurrent")}
                  </div>
                </div>

                <div className="rounded-md border bg-slate-50 p-3 text-sm text-slate-800">
                  <div className="text-xs font-medium text-slate-500">
                    {t("topicPicker.previewTitle")}
                  </div>
                  <div className="mt-2">
                    {buildExplainMini({
                      topicName: selected.name,
                      location,
                      useOriginalRule,
                    })}
                  </div>
                </div>

                <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-2 bg-white pt-3">
                  <button
                    type="button"
                    className="rounded border px-3 py-1 text-sm"
                    onClick={onClose}
                  >
                    {t("topicPicker.cancel")}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                    disabled={!canConfirm}
                    onClick={() => {
                      if (!selected) return;
                      const draft: TopicConditionDraft = {
                        topic: {
                          id: selected.id,
                          name: selected.name,
                          status: selected.status,
                        },
                        location,
                        rangeMode,
                        useOriginalRule,
                        explainPreview: buildExplainMini({
                          topicName: selected.name,
                          location,
                          useOriginalRule,
                        }),
                        validation: { valid: true },
                      };
                      onConfirm(draft);
                    }}
                  >
                    {t("topicPicker.confirm")}
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
