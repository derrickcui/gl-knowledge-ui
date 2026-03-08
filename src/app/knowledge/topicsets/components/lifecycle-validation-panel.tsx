"use client";

import {
  TopicSetCoverageConflict,
  TopicSetValidationDetails,
  TopicSetValidationIssue,
} from "@/lib/topicset-api";
import { t } from "@/i18n";

function renderIssueLabel(item: TopicSetValidationIssue) {
  if (item.path) return `${item.path} · ${item.message}`;
  if (item.nodeId) return `${item.nodeId} · ${item.message}`;
  return item.message;
}

function renderConflictLabel(item: TopicSetCoverageConflict) {
  return `${item.path} <> ${item.conflictingPath} · ${item.message}`;
}

function ValidationGroup({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: unknown[];
  renderItem: (item: any) => string;
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-md border border-rose-200 bg-rose-50 p-3">
      <h4 className="text-sm font-semibold text-rose-800">{title}</h4>
      <ul className="mt-2 space-y-1 text-xs text-rose-700">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="rounded bg-white/70 px-2 py-1">
            {renderItem(item)}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LifecycleValidationPanel({
  details,
}: {
  details: TopicSetValidationDetails | null | undefined;
}) {
  if (!details) return null;

  const total =
    details.orphanNodes.length +
    details.unboundTopics.length +
    details.cycleStructure.length +
    details.coverageConflicts.length;

  if (total === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {t("topicSet.validation.summary")}
      </div>
      <ValidationGroup
        title={t("topicSet.validation.orphanNodes")}
        items={details.orphanNodes}
        renderItem={renderIssueLabel}
      />
      <ValidationGroup
        title={t("topicSet.validation.unboundTopics")}
        items={details.unboundTopics}
        renderItem={renderIssueLabel}
      />
      <ValidationGroup
        title={t("topicSet.validation.cycleStructure")}
        items={details.cycleStructure}
        renderItem={renderIssueLabel}
      />
      <ValidationGroup
        title={t("topicSet.validation.coverageConflicts")}
        items={details.coverageConflicts}
        renderItem={renderConflictLabel}
      />
    </div>
  );
}
