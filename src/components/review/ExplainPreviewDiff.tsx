"use client";

import ExplainBlockView from "../explain/ExplainBlockView";
import { ExplainBlock } from "../explain/explainTypes";
import { ExplainDiffItem } from "./explainDiffTypes";
import { diffStyleForBlock } from "./explainDiffUtils";

interface ExplainPayload {
  title?: string;
  blocks: ExplainBlock[];
}

interface Props {
  before?: ExplainPayload;
  after: ExplainPayload;
  diff?: ExplainDiffItem[];
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
}

export default function ExplainPreviewDiff({
  before,
  after,
  diff,
  onHoverEvidence,
  onClickEvidence,
}: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ExplainSide
        title="变更前"
        explain={before}
        diff={diff}
        side="before"
        onHoverEvidence={onHoverEvidence}
        onClickEvidence={onClickEvidence}
      />
      <ExplainSide
        title="变更后"
        explain={after}
        diff={diff}
        side="after"
        onHoverEvidence={onHoverEvidence}
        onClickEvidence={onClickEvidence}
      />
    </div>
  );
}

interface ExplainSideProps {
  title: string;
  explain?: ExplainPayload;
  diff?: ExplainDiffItem[];
  side: "before" | "after";
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
}

function ExplainSide({
  title,
  explain,
  diff,
  side,
  onHoverEvidence,
  onClickEvidence,
}: ExplainSideProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700">
        {title}
      </div>
      {!explain ? (
        <div className="rounded border border-dashed p-3 text-xs text-slate-400">
          无内容
        </div>
      ) : (
        <div className="space-y-2">
          {explain.title && (
            <div className="text-xs text-slate-500">
              {explain.title}
            </div>
          )}
          {explain.blocks.map((block, idx) => (
            <div
              key={`${side}-${idx}-${block.title}`}
              className={`rounded border p-1 ${diffStyleForBlock(
                diff,
                idx,
                side
              )}`}
            >
              <ExplainBlockView
                block={block}
                onHoverEvidence={onHoverEvidence}
                onClickEvidence={onClickEvidence}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
