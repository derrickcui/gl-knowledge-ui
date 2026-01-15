"use client";

import { useEffect, useState } from "react";
import type { AuditAction, AuditRecord } from "@/types/audit";
import { fetchGlossaryAuditLogs } from "@/lib/api";
import { AuditHeader } from "@/components/glossary/audit/audit-header";
import { AuditTimeline } from "@/components/glossary/audit/audit-timeline";

const ACTION_OPTIONS: Array<{ label: string; value: AuditAction }> = [
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Archived", value: "ARCHIVED" },
];

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
  const [query, setQuery] = useState("");
  const [beforeDate, setBeforeDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [activeActions, setActiveActions] = useState<Set<AuditAction>>(
    () => new Set(ACTION_OPTIONS.map((o) => o.value))
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
      setLoading(true);
      try {
        const res = await fetchGlossaryAuditLogs({
          limit: 20,
          query: query.trim() || undefined,
          before: beforeDate || undefined,
        });
        setItems(res.items);
        setCursor(res.nextCursor);
        setHasMore(res.hasMore);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [query, beforeDate]);

  async function loadMore() {
    if (!hasMore || loading || !cursor) return;

    setLoading(true);
    try {
      const res = await fetchGlossaryAuditLogs({
        limit: 20,
        before: cursor,
        query: query.trim() || undefined,
      });

      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AuditHeader
        actions={ACTION_OPTIONS}
        selectedActions={activeActions}
        onToggleAction={toggleAction}
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
