"use client";

import { useState } from "react";
import { ApprovalDTO } from "@/lib/api";
import { ApprovalTable } from "@/components/glossary/approval/approval-table";

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
        <div className="text-lg font-semibold">Approvals</div>
        <p className="mt-2 text-sm opacity-70">
          Terms under review that require your decision.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          placeholder="Search approvals"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      <ApprovalTable items={filteredItems} />
    </div>
  );
}
