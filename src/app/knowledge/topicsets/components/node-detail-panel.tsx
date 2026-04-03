"use client";

import { useEffect, useState } from "react";
import { TopicSetNode, TopicSetNodeDetail } from "@/lib/topicset-api";
import { t } from "@/i18n";
import { AIOptimizePanel } from "../[id]/components/ai/ai-optimize-panel";

type NodeDetailPanelProps = {
  node: TopicSetNode | null;
  detail?: TopicSetNodeDetail | null;
  displayPath?: string;
  detailLoading?: boolean;
  topicsBound: number;
  coverageDocs?: number;
  impactDocs?: number;
  readOnly: boolean;
  description?: string;
  saving?: boolean;
  onSave: (payload: { name: string; description: string }) => Promise<void>;
  aiAnalysis?: {
    issues: string[];
    suggestions: string[];
    explain?: string[];
  } | null;
  aiActions?: Array<{
    id: string;
    label: string;
    hint: string;
    onClick: () => void;
  }>;
  aiSuggestionActions?: Array<{
    id: string;
    title: string;
    reason: string;
    confidence?: number;
    onApply: () => void;
  }>;
};

export function NodeDetailPanel({
  node,
  detail,
  displayPath,
  detailLoading = false,
  topicsBound,
  coverageDocs,
  impactDocs,
  readOnly,
  description,
  saving = false,
  onSave,
  aiAnalysis,
  aiActions = [],
  aiSuggestionActions = [],
}: NodeDetailPanelProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    setName(detail?.name ?? node?.name ?? "");
    setDesc(detail?.description ?? description ?? "");
  }, [node?.id, node?.name, detail?.id, detail?.name, detail?.description, description]);

  if (!node) {
    return (
      <section className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">{t("topicSet.detail.title")}</h2>
        </div>
        <div className="p-4 text-sm text-muted-foreground">{t("topicSet.detail.empty")}</div>
      </section>
    );
  }

  const path = displayPath ?? detail?.path ?? node.path;
  const depth = detail?.depth ?? node.path.split("/").filter(Boolean).length;
  const boundCount = detail?.topicCount ?? topicsBound;
  const coverageCount = typeof coverageDocs === "number" ? coverageDocs : (detail?.docCount ?? node.docCount ?? 0);
  const impactCount = typeof impactDocs === "number" ? impactDocs : coverageCount;

  return (
    <section className="rounded-lg border bg-white">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t("topicSet.detail.title")}</h2>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">{t("topicSet.detail.path")}</div>
          <div className="mt-1 rounded-md bg-muted/40 px-2 py-1 font-mono text-xs">{path}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-muted-foreground">{t("topicSet.detail.depth")}</div>
            <div className="mt-1">{depth}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("topicSet.detail.topicsBound")}</div>
            <div className="mt-1">{boundCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("topicSet.detail.coverage")}</div>
            <div className="mt-1">{coverageCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("topicSet.detail.impact")}</div>
            <div className="mt-1">{impactCount}</div>
          </div>
        </div>
        <AIOptimizePanel
          analysis={aiAnalysis ?? null}
          actions={aiActions}
          suggestionActions={aiSuggestionActions}
        />
        {detailLoading && <div className="text-xs text-muted-foreground">{t("common.loading")}</div>}
        <div>
          <label className="text-xs text-muted-foreground">{t("topicSet.detail.nodeName")}</label>
          <input
            className="mt-1 h-9 w-full rounded-md border px-3 text-sm disabled:bg-muted/40"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={readOnly}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{t("topicSet.detail.description")}</label>
          <textarea
            className="mt-1 h-24 w-full rounded-md border px-3 py-2 text-sm disabled:bg-muted/40"
            value={desc}
            onChange={(event) => setDesc(event.target.value)}
            disabled={readOnly}
          />
        </div>
        <button
          type="button"
          className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40"
          onClick={() => onSave({ name: name.trim(), description: desc.trim() })}
          disabled={readOnly || !name.trim() || saving}
        >
          {saving ? t("topicSet.common.saving") : t("topicSet.common.save")}
        </button>
      </div>
    </section>
  );
}
