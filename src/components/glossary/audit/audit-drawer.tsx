"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

import type { AuditRecord } from "@/types/audit";

/**
 * AuditDrawer
 * - 只读
 * - 展示某一次 Audit Record 对应的 Concept Snapshot
 * - 不负责 fetch 列表，只 fetch snapshot
 */
export function AuditDrawer({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: AuditRecord | null;
  onClose: () => void;
}) {
  // 关闭时禁止 body 滚动（基础处理）
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* drawer */}
      <div
        className={clsx(
          "absolute right-0 top-0 h-full w-[520px]",
          "bg-background shadow-xl",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <div className="text-sm font-medium">
              {record.conceptName}
            </div>
            <div className="text-xs text-muted-foreground">
              Viewing historical snapshot
              {record.version ? ` · ${record.version}` : ""}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 text-sm">
          <SnapshotContent record={record} />
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Audit snapshots are read-only and immutable.
        </div>
      </div>
    </div>
  );
}

/**
 * SnapshotContent
 * ⚠️ v1：只展示 audit record 自带的信息
 * v2：这里可以 fetch `/concepts/{id}/snapshots/{version}`
 */
function SnapshotContent({ record }: { record: AuditRecord }) {
  return (
    <div className="space-y-4">
      <section>
        <div className="font-medium">Action</div>
        <div className="text-muted-foreground">
          {record.action}
        </div>
      </section>

      <section>
        <div className="font-medium">Actor</div>
        <div className="text-muted-foreground">
          {record.actor}
        </div>
      </section>

      <section>
        <div className="font-medium">Time</div>
        <div className="text-muted-foreground">
          {new Date(record.actedAt).toLocaleString()}
        </div>
      </section>

      {record.reason && (
        <section>
          <div className="font-medium">Reason</div>
          <div className="text-muted-foreground">
            {record.reason}
          </div>
        </section>
      )}

      {record.version && (
        <section>
          <div className="font-medium">Snapshot Version</div>
          <div className="text-muted-foreground">
            {record.version}
          </div>
        </section>
      )}
    </div>
  );
}
