import { CandidateDTO } from "@/lib/api";

export function CandidateEvidencePanel({
  candidate,
}: {
  candidate: CandidateDTO;
}) {
  return (
    <div className="space-y-3 rounded-md border p-4">
      <h2 className="font-medium">Evidence</h2>

      <div className="text-sm">
        <span className="opacity-60">Source:</span>{" "}
        {candidate.source}
      </div>

      <div className="text-sm">
        <span className="opacity-60">Topics:</span>{" "}
        {candidate.topics.length
          ? candidate.topics.join(", ")
          : "—"}
      </div>

      <div className="rounded-md bg-muted p-3 text-xs leading-relaxed">
        <div className="mb-1 font-medium">
          Confidence explanation
        </div>
        <ul className="list-disc space-y-1 pl-4">
          <li>在多个文档中重复出现</li>
          <li>上下文语义一致</li>
          <li>命中抽取规则或统计模型</li>
        </ul>
      </div>
    </div>
  );
}
