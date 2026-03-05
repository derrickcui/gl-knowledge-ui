import { AnalyticsRuntimeStatusView } from "@/lib/analytics-api";

type GovernanceCardProps = {
  runtimeStatus: AnalyticsRuntimeStatusView | null;
  coverageRate?: number | null;
};

export function GovernanceCard({ runtimeStatus, coverageRate }: GovernanceCardProps) {
  const version = runtimeStatus?.runtimeVersion ?? "-";
  const incremental = runtimeStatus?.incrementalEnabled ? "ON" : "OFF";
  const jobsRunning = runtimeStatus?.jobsRunning ?? 0;
  const coverageText =
    typeof coverageRate === "number" ? `${coverageRate.toFixed(2)}%` : "-";
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">Governance</h2>
      <div className="mt-3 space-y-3 text-xs text-slate-300">
        <div className="rounded-md border border-slate-700 bg-slate-950/80 p-3">
          Runtime 状态：{version} · Jobs Running {jobsRunning}
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-950/80 p-3">
          Incremental：{incremental}
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-950/80 p-3">
          Coverage：{coverageText}
        </div>
      </div>
    </article>
  );
}
