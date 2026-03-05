import { TrendRange } from "@/store/useSemanticGovernanceStore";
import { buildTrendPath } from "../dashboard-utils";

type TrendChartCardProps = {
  range: TrendRange;
  topicId: string;
  trendData: Record<string, number[]>;
  onRangeChange: (range: TrendRange) => void;
};

export function TrendChartCard(props: TrendChartCardProps) {
  const { range, topicId, trendData, onRangeChange } = props;
  const seriesValues = Object.values(trendData);
  if (!seriesValues.length) {
    return (
      <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-lg font-semibold">Topic Volume Trend</h2>
        <p className="mt-3 text-xs text-slate-400">暂无趋势数据。</p>
      </article>
    );
  }
  const trendMax = Math.max(...seriesValues.flatMap((series) => series));
  const trendPathWidth = 430;
  const trendPathHeight = 160;

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Topic Volume Trend</h2>
        <span className="text-xs text-slate-400">Topic: {topicId}</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`rounded-md px-2 py-1 ${
              range === "7d" ? "bg-blue-500/30 text-blue-200" : "bg-slate-800 text-slate-300"
            }`}
            onClick={() => onRangeChange("7d")}
          >
            7 天
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 ${
              range === "30d" ? "bg-blue-500/30 text-blue-200" : "bg-slate-800 text-slate-300"
            }`}
            onClick={() => onRangeChange("30d")}
          >
            30 天
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 ${
              range === "14d" ? "bg-blue-500/30 text-blue-200" : "bg-slate-800 text-slate-300"
            }`}
            onClick={() => onRangeChange("14d")}
          >
            自定义
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${trendPathWidth} ${trendPathHeight + 26}`}
        className="mt-4 w-full"
      >
        <line
          x1="0"
          y1={trendPathHeight}
          x2={trendPathWidth}
          y2={trendPathHeight}
          stroke="rgba(148,163,184,0.35)"
        />
        {Object.entries(trendData).map(([name, values], idx) => (
          <path
            key={name}
            d={buildTrendPath(values, trendPathWidth, trendPathHeight, trendMax)}
            fill="none"
            stroke={["#60a5fa", "#a78bfa", "#22d3ee"][idx]}
            strokeWidth={2.5}
          />
        ))}
        <text x="0" y={trendPathHeight + 20} fill="#94a3b8" fontSize="10">
          时间
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {Object.keys(trendData).map((name, idx) => (
          <span key={name} className="inline-flex items-center gap-1 text-slate-300">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: ["#60a5fa", "#a78bfa", "#22d3ee"][idx] }}
            />
            {name}
          </span>
        ))}
      </div>
    </article>
  );
}
