"use client";

import { t } from "@/i18n";

export type TopicSetWorkspaceTab = "taxonomy" | "impact" | "coverage" | "unmapped" | "versions" | "diff";

const TAB_KEYS: Record<TopicSetWorkspaceTab, Parameters<typeof t>[0]> = {
  taxonomy: "topicSet.tab.taxonomy",
  impact: "topicSet.tab.impact",
  coverage: "topicSet.tab.coverage",
  unmapped: "topicSet.tab.unmapped",
  versions: "topicSet.tab.versions",
  diff: "topicSet.tab.diff",
};

export function WorkspaceTabs({
  activeTab,
  onChange,
}: {
  activeTab: TopicSetWorkspaceTab;
  onChange: (tab: TopicSetWorkspaceTab) => void;
}) {
  return (
    <section className="rounded-lg border bg-white">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        {(Object.keys(TAB_KEYS) as TopicSetWorkspaceTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              activeTab === tab ? "bg-black text-white" : "hover:bg-muted"
            }`}
            onClick={() => onChange(tab)}
          >
            {t(TAB_KEYS[tab])}
          </button>
        ))}
      </div>
    </section>
  );
}
