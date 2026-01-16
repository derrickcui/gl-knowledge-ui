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
          : "None"}
      </div>

      <div className="rounded-md bg-muted p-3 text-xs leading-relaxed">
        <div className="mb-1 font-medium">Evidence</div>
        {candidate.evidence?.length ? (
          <ul className="list-disc space-y-2 pl-4">
            {candidate.evidence.map((item) => (
              <li key={item.chunk_id}>
                <div>{item.quote}</div>
                <a
                  href={`/knowledge/glossary/chunks/${item.chunk_id}`}
                  className="text-xs text-muted-foreground underline"
                >
                  Chunk: {item.chunk_id}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="opacity-70">No evidence provided.</div>
        )}
      </div>
    </div>
  );
}
