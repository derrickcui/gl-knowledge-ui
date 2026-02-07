"use client";

import { useState } from "react";
import { ApprovalDTO } from "@/lib/api";
import { ApprovalTable } from "@/components/glossary/approval/approval-table";
import { t } from "@/i18n";

export function ApprovalsView({
  initialItems,
}: {
  initialItems: ApprovalDTO[];
}) {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? initialItems.filter((item) =>
        item.candidateName
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : initialItems;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">
          {t("glossary.approvals.title")}
        </div>
        <p className="mt-2 text-sm opacity-70">
          {t("glossary.approvals.subtitle")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          placeholder={t("glossary.approvals.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => setQuery("")}
          >
            {t("glossary.common.clear")}
          </button>
        )}
      </div>

      <ApprovalTable items={filteredItems} />
    </div>
  );
}
