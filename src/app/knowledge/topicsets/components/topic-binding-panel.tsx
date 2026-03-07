"use client";

import { useEffect, useRef, useState } from "react";
import { NodeTopicView } from "@/lib/topicset-api";
import { TopicDTO } from "@/lib/topic-api";
import { t } from "@/i18n";

type TopicBindingPanelProps = {
  readOnly: boolean;
  boundTopics: NodeTopicView[];
  topicDocCountMap?: Record<string, number>;
  loadingBoundTopics?: boolean;
  onUnbind: (topicId: string) => Promise<void>;
  onSearch: (keyword: string) => Promise<TopicDTO[]>;
  onBind: (topicId: string) => Promise<void>;
  onViewDocuments: (topic: NodeTopicView) => Promise<void>;
};

export function TopicBindingPanel({
  readOnly,
  boundTopics,
  topicDocCountMap,
  loadingBoundTopics = false,
  onUnbind,
  onSearch,
  onBind,
  onViewDocuments,
}: TopicBindingPanelProps) {
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TopicDTO[]>([]);
  const [bindingTopicId, setBindingTopicId] = useState<string | null>(null);
  const [removingTopicId, setRemovingTopicId] = useState<string | null>(null);
  const latestSearchSeq = useRef(0);

  async function handleSearch(nextKeyword: string) {
    const trimmed = nextKeyword.trim();
    if (!trimmed) {
      latestSearchSeq.current += 1;
      setResults([]);
      setSearching(false);
      return;
    }
    const currentSeq = latestSearchSeq.current + 1;
    latestSearchSeq.current = currentSeq;
    setSearching(true);
    try {
      const data = await onSearch(trimmed);
      if (latestSearchSeq.current === currentSeq) {
        setResults(data);
      }
    } finally {
      if (latestSearchSeq.current === currentSeq) {
        setSearching(false);
      }
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void handleSearch(keyword);
    }, 250);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <section className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("topicSet.binding.title")}</h2>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{t("topicSet.binding.topicsBound")}</div>
          {loadingBoundTopics ? (
            <div className="mt-2 text-xs text-muted-foreground">{t("topicSet.binding.loading")}</div>
          ) : boundTopics.length === 0 ? (
            <div className="mt-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              {t("topicSet.binding.empty")}
            </div>
          ) : (
            <ul className="mt-2 space-y-2">
              {boundTopics.map((topic) => (
                <li key={topic.topicId} className="rounded-md border px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-xs">
                      {topic.topicName ?? topic.topicId}
                      {typeof topicDocCountMap?.[topic.topicId] === "number" && (
                        <span className="ml-1 text-[11px] text-muted-foreground">
                          {t("topicSet.binding.docsCount", { count: topicDocCountMap[topic.topicId] })}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="ml-auto rounded border px-2 py-0.5 text-xs"
                      onClick={() => onViewDocuments(topic)}
                    >
                      {t("topicSet.binding.viewDocs")}
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-0.5 text-xs disabled:opacity-40"
                      onClick={async () => {
                        setRemovingTopicId(topic.topicId);
                        try {
                          await onUnbind(topic.topicId);
                        } finally {
                          setRemovingTopicId(null);
                        }
                      }}
                      disabled={readOnly || removingTopicId === topic.topicId}
                    >
                      {t("topicSet.binding.unbind")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t pt-3">
          <div className="text-xs text-muted-foreground">{t("topicSet.binding.addTopic")}</div>
          <div className="mt-2 text-xs text-muted-foreground">{t("topicSet.binding.searchTitle")}</div>
          <div className="mt-2 flex gap-2">
            <input
              className="h-9 flex-1 rounded-md border px-3 text-sm"
              placeholder={t("topicSet.binding.searchPlaceholder")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">{t("topicSet.binding.results")}</div>
          <ul className="mt-2 max-h-44 overflow-auto rounded-md border scrollbar-thin">
            {results.map((topic) => (
              <li
                key={topic.id}
                className="flex items-center gap-2 border-b px-2 py-2 last:border-b-0"
              >
                <span className="truncate text-xs">{topic.name}</span>
                <button
                  type="button"
                  className="ml-auto rounded border px-2 py-0.5 text-xs disabled:opacity-40"
                  disabled={readOnly || bindingTopicId === topic.id}
                  onClick={async () => {
                    setBindingTopicId(topic.id);
                    try {
                      await onBind(topic.id);
                    } finally {
                      setBindingTopicId(null);
                    }
                  }}
                >
                  {t("topicSet.binding.bind")}
                </button>
              </li>
            ))}
            {searching && (
              <li className="px-2 py-3 text-xs text-muted-foreground">{t("common.loading")}</li>
            )}
            {!searching && keyword.trim().length > 0 && results.length === 0 && (
              <li className="px-2 py-3 text-xs text-muted-foreground">{t("topicSet.binding.noResults")}</li>
            )}
            {!searching && keyword.trim().length === 0 && (
              <li className="px-2 py-3 text-xs text-muted-foreground">
                {t("topicSet.binding.typeToSearch")}
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
