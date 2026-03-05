"use client";

import { useEffect, useState } from "react";
import type { AuditAction, AuditRecord } from "@/types/audit";
import { fetchGlossaryAuditLogs } from "@/lib/api";
import { AuditHeader } from "@/components/glossary/audit/audit-header";
import { AuditTimeline } from "@/components/glossary/audit/audit-timeline";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { t } from "@/i18n";

export default function PageClient({
  initialItems,
  initialCursor,
  initialHasMore,
}: {
  initialItems: AuditRecord[];
  initialCursor: string | null;
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState<AuditRecord[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [beforeDate, setBeforeDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const actionOptions: Array<{ label: string; value: AuditAction }> = [
    { label: t("glossary.audit.actions.approved"), value: "APPROVED" },
    { label: t("glossary.audit.actions.rejected"), value: "REJECTED" },
    { label: t("glossary.audit.actions.published"), value: "PUBLISHED" },
    { label: t("glossary.audit.actions.archived"), value: "ARCHIVED" },
  ];
  const [activeActions, setActiveActions] = useState<Set<AuditAction>>(
    () => new Set(actionOptions.map((o) => o.value))
  );

  const filteredItems = items.filter((item) =>
    activeActions.has(item.action)
  );

  function toggleAction(action: AuditAction) {
    setActiveActions((prev) => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  }

  useEffect(() => {
    const run = async () => {
      setStatusMessage(
        t("glossary.common.processing", {
          action: t("glossary.common.action.search"),
        })
      );
      setLoading(true);
      try {
        const res = await fetchGlossaryAuditLogs({
          limit: 20,
          query: query.trim() || undefined,
          before: beforeDate || undefined,
        });
        if (res.data) {
          setItems(res.data.items);
          setCursor(res.data.nextCursor);
          setHasMore(res.data.hasMore);
        }
      } finally {
        setLoading(false);
        setStatusMessage(null);
      }
    };

    run();
  }, [query, beforeDate]);

  async function loadMore() {
    if (!hasMore || loading || !cursor) return;

    setStatusMessage(
      t("glossary.common.processing", {
        action: t("glossary.common.action.loadMore"),
      })
    );
    setLoading(true);
    try {
      const res = await fetchGlossaryAuditLogs({
        limit: 20,
        before: cursor,
        query: query.trim() || undefined,
      });

      const data = res.data;
      if (data) {
        setItems((prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {statusMessage && (
        <div className="p-4">
          <FeedbackBanner type="info" title={statusMessage} />
        </div>
      )}
      <AuditHeader
        actions={actionOptions}
        selectedActions={activeActions as Set<string>}
        onToggleAction={(action) => toggleAction(action as AuditAction)}
        query={query}
        onQueryChange={setQuery}
        beforeDate={beforeDate}
        onBeforeDateChange={setBeforeDate}
      />

      <div className="flex-1 overflow-auto p-4">
        <AuditTimeline
          records={filteredItems}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
