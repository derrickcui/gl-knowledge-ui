"use client";

type DashboardHeaderProps = {
  runtimeVersion: string;
  incrementalEnabled: boolean;
  lastRetagTime: string | null;
  topicInput: string;
  actionLoading: boolean;
  onTopicInputChange: (value: string) => void;
  onCreateFull: () => void;
  onCreateTopic: () => void;
};

export function DashboardHeader(props: DashboardHeaderProps) {
  const {
    runtimeVersion,
    incrementalEnabled,
    lastRetagTime,
    topicInput,
    actionLoading,
    onTopicInputChange,
    onCreateFull,
    onCreateTopic,
  } = props;

  return (
    <section className="rounded-2xl border border-blue-400/30 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/80 p-6 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Semantic Governance Control Center
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Runtime Version: {runtimeVersion} · Incremental:{" "}
            {incrementalEnabled ? "ON" : "OFF"} · Last Retag:{" "}
            {lastRetagTime ? new Date(lastRetagTime).toLocaleString() : "-"} · Status:
            <span className="ml-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-emerald-300">
              Healthy
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-blue-300/30 bg-blue-500/10 px-3 py-2 text-sm hover:bg-blue-500/20 disabled:opacity-50"
            onClick={onCreateFull}
            disabled={actionLoading}
          >
            全量重算
          </button>
          <div className="flex items-center gap-2 rounded-lg border border-violet-300/30 bg-violet-500/10 px-2 py-1">
            <input
              value={topicInput}
              onChange={(event) => onTopicInputChange(event.target.value)}
              className="w-32 bg-transparent text-xs outline-none placeholder:text-slate-400"
              placeholder="输入 topicId"
            />
            <button
              type="button"
              className="rounded-md bg-violet-500/30 px-2 py-1 text-xs hover:bg-violet-500/40 disabled:opacity-50"
              onClick={onCreateTopic}
              disabled={actionLoading}
            >
              单 Topic 重算
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {["Coverage", "Trend", "Distribution", "Jobs", "Drift", "Governance"].map(
          (item) => (
            <span
              key={item}
              className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-slate-300"
            >
              {item}
            </span>
          )
        )}
      </div>
    </section>
  );
}
