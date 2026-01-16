"use client";

import { useState } from "react";
import { AuditRecord } from "@/types/audit";
import { AuditRecordSummary } from "./audit-record-summary";
import { AuditRecordDetail } from "./audit-record-detail";
import { AuditDrawer } from "./audit-drawer";

export function AuditRecordItem({ record }: { record: AuditRecord }) {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<
    "snapshot" | "current"
  >("snapshot");

  return (
    <>
      <div className="rounded border bg-background shadow-sm">
        <AuditRecordSummary
          record={record}
          onClick={() => setExpanded((v) => !v)}
        />

        {expanded && (
          <AuditRecordDetail
            record={record}
            onViewSnapshot={() => {
              setDrawerMode("snapshot");
              setDrawerOpen(true);
            }}
            onViewCurrent={() => {
              setDrawerMode("current");
              setDrawerOpen(true);
            }}
          />
        )}
      </div>

      <AuditDrawer
        open={drawerOpen}
        record={record}
        mode={drawerMode}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
