"use client";

import { useRouter } from "next/navigation";
import { ApprovalDTO } from "@/lib/api";

export function ApprovalRow({
  candidate,
}: {
  candidate: ApprovalDTO;
}) {
  const router = useRouter();
  const submittedAt = candidate.createdAt ?? "-";

  return (
    <tr className="hover:bg-muted/60">
      <td className="border-b px-3 py-2">
        <div className="font-medium">
          {candidate.candidateName}
        </div>
      </td>
      <td className="border-b px-3 py-2">
        {candidate.status}
      </td>
      <td className="border-b px-3 py-2">{submittedAt}</td>
      <td className="border-b px-3 py-2 text-right">
        <button
          className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
          onClick={() =>
            router.push(
              `/knowledge/glossary/candidates/${candidate.candidateId}?changeId=${candidate.changeId}`
            )
          }
        >
          Review
        </button>
      </td>
    </tr>
  );
}
