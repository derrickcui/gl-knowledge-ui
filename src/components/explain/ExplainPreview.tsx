"use client";

import { ExplainBlock } from "./explainTypes";
import ExplainBlockView from "./ExplainBlockView";

interface Props {
  explain: {
    title?: string;
    blocks: ExplainBlock[];
  };
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
}

export default function ExplainPreview({
  explain,
  onHoverEvidence,
  onClickEvidence,
}: Props) {
  return (
    <aside className="rounded-lg border bg-white p-4">
      {explain.title && (
        <h3 className="text-sm font-semibold text-slate-800">
          {explain.title}
        </h3>
      )}

      <div className="mt-3 space-y-3">
        {explain.blocks.map((block, idx) => (
          <ExplainBlockView
            key={`${idx}-${block.title}`}
            block={block}
            onHoverEvidence={onHoverEvidence}
            onClickEvidence={onClickEvidence}
          />
        ))}
      </div>
    </aside>
  );
}
