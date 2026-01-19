"use client";

import { EvidenceRef } from "./explainTypes";

interface Props {
  evidence: EvidenceRef[];
  onHoverEvidence?: (path: number[] | null) => void;
  onClickEvidence?: (path: number[]) => void;
}

export default function ExplainEvidence({
  evidence,
  onHoverEvidence,
  onClickEvidence,
}: Props) {
  return (
    <div className="mt-2 space-y-1 border-t pt-2 text-xs text-slate-600">
      {evidence.map((ev, idx) => (
        <div
          key={`${idx}-${ev.path.join(".")}`}
          className="cursor-pointer hover:underline"
          onMouseEnter={() => onHoverEvidence?.(ev.path)}
          onMouseLeave={() => onHoverEvidence?.(null)}
          onClick={() => onClickEvidence?.(ev.path)}
        >
          ↳ 对应规则条件{ev.label ? `：${ev.label}` : ""}
        </div>
      ))}
    </div>
  );
}
