"use client";

import { ExplainBlock } from "./explainTypes";
import ExplainEvidence from "./ExplainEvidence";

interface Props {
  block: ExplainBlock;
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
}

export default function ExplainBlockView({
  block,
  onHoverEvidence,
  onClickEvidence,
}: Props) {
  const color =
    block.level === "ERROR"
      ? "border-red-400 bg-red-50"
      : block.level === "WARNING"
      ? "border-amber-400 bg-amber-50"
      : "border-slate-300 bg-slate-50";

  return (
    <div className={`rounded border p-3 ${color}`}>
      <div className="mb-1 text-sm font-medium">{block.title}</div>
      <ul className="space-y-1 text-sm">
        {block.lines.map((line, idx) => (
          <li key={`${idx}-${line}`} className="flex items-start gap-1">
            <span>•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {block.evidence && block.evidence.length > 0 && (
        <ExplainEvidence
          evidence={block.evidence}
          onHoverEvidence={onHoverEvidence}
          onClickEvidence={onClickEvidence}
        />
      )}
    </div>
  );
}
