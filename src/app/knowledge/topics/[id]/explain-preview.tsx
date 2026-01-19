"use client";

import ExplainPreviewView from "@/components/explain/ExplainPreview";
import { ExplainBlock } from "@/components/explain/explainTypes";

const SAMPLE_EXPLAIN: { title?: string; blocks: ExplainBlock[] } = {
  title: "Explain Preview",
  blocks: [
    {
      level: "INFO",
      title: "规则含义",
      lines: ["文档涉及该概念及其下位概念", "内容出现在正文中"],
      evidence: [
        { path: [0], label: "涉及概念" },
        { path: [0, 0], label: "正文范围" },
      ],
    },
    {
      level: "WARNING",
      title: "可能过宽",
      lines: ["当前规则覆盖面较大，可能产生误报"],
      evidence: [{ path: [0], label: "概念范围" }],
    },
  ],
};

interface Props {
  explain?: { title?: string; blocks: ExplainBlock[] };
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
  emptyMessage?: string;
}

export function ExplainPreview({
  explain = SAMPLE_EXPLAIN,
  onHoverEvidence,
  onClickEvidence,
  emptyMessage,
}: Props) {
  if (emptyMessage) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm font-semibold">Explain Preview</div>
        <div className="mt-3 rounded-md border border-dashed p-3 text-sm text-slate-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <ExplainPreviewView
      explain={explain}
      onHoverEvidence={onHoverEvidence}
      onClickEvidence={onClickEvidence}
    />
  );
}
