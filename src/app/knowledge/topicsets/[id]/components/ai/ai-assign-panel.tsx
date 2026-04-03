"use client";

import { t } from "@/i18n";

export function AIAssignPanel({
  readOnly,
  recommendedTopics,
  unmappedTopics,
  onBindRecommended,
  onAutoClassify,
}: {
  readOnly: boolean;
  recommendedTopics: Array<{ topicId: string; topicName: string; score: number }>;
  unmappedTopics: string[];
  onBindRecommended?: () => Promise<void>;
  onAutoClassify?: () => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/70 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">
          {t("topicSet.ai.recommendedBinding")}
        </div>
        {recommendedTopics.length === 0 ? (
          <div className="mt-2 text-xs text-muted-foreground">{t("topicSet.ai.noRecommendedTopics")}</div>
        ) : (
          <>
            <ul className="mt-2 space-y-2">
              {recommendedTopics.map((topic) => (
                <li key={topic.topicId} className="flex items-center gap-2 rounded-md border bg-white px-2 py-2">
                  <span className="truncate text-xs">{topic.topicName}</span>
                  <span className="ml-auto rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-medium text-fuchsia-700">
                    {t("topicSet.ai.matchScore", { score: topic.score })}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 rounded-md bg-black px-3 py-1.5 text-xs text-white disabled:opacity-40"
              onClick={() => void onBindRecommended?.()}
              disabled={readOnly || recommendedTopics.length === 0}
            >
              {t("topicSet.ai.addAll")}
            </button>
          </>
        )}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          {t("topicSet.ai.unmappedTopics")}
        </div>
        {unmappedTopics.length === 0 ? (
          <div className="mt-2 text-xs text-muted-foreground">{t("topicSet.ai.noUnmappedTopics")}</div>
        ) : (
          <ul className="mt-2 space-y-1 text-xs">
            {unmappedTopics.map((topic) => (
              <li key={topic}>- {topic}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-800 disabled:opacity-40"
          onClick={() => void onAutoClassify?.()}
          disabled={readOnly || !onAutoClassify}
        >
          {t("topicSet.ai.autoAssign")}
        </button>
      </div>
    </div>
  );
}
