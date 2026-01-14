"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { fetchCandidates, CandidateDTO } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { ConfidenceLabel } from "@/components/glossary/confidence-label";

export function CandidatesView({
  initialStatus,
  initialData,
}: {
  initialStatus: string;
  initialData: CandidateDTO[];
}) {
  const router = useRouter(); // ⭐ 关键 1
  const [status, setStatus] = useState(initialStatus);
  const [rows, setRows] = useState<CandidateDTO[]>(initialData);
  const [loading, setLoading] = useState(false);

  async function reload(nextStatus: string) {
    setLoading(true);
    try {
      const data = await fetchCandidates({
        status: nextStatus,
        limit: 50,
        offset: 0,
      });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Candidates</h1>
        <p className="text-sm opacity-70">
          自动抽取的候选术语，需要人工审阅后才能进入知识体系。
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={status}
          onChange={(e) => {
            const v = e.target.value;
            setStatus(v);
            reload(v);
          }}
        >
          <option value="CANDIDATE">CANDIDATE</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        {loading && (
          <span className="text-sm opacity-60">Loading…</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b px-3 py-2 text-left">
                Canonical
              </th>
              <th className="border-b px-3 py-2 text-left">
                Role
              </th>
              <th className="border-b px-3 py-2 text-left">
                Confidence
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => {
                  // ⭐ 关键 2：真正的跳转逻辑
                  router.push(
                    `/knowledge/glossary/candidates/${r.id}`
                  );
                }}
              >
                <td className="border-b px-3 py-2">
                  {r.canonical}
                </td>

                <td className="border-b px-3 py-2">
                  <Badge variant={r.role as any}>
                    {r.role}
                  </Badge>
                </td>

                <td className="border-b px-3 py-2">
                  <ConfidenceLabel value={r.confidence} />
                </td>
              </tr>
            ))}

            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-sm opacity-60"
                >
                  No candidates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
