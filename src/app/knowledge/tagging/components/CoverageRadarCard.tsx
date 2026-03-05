import { radarPoint } from "../dashboard-utils";
import { DimensionKey, RadarDimension } from "@/store/useSemanticGovernanceStore";

type CoverageRadarCardProps = {
  dimensions: RadarDimension[];
  selectedDimension: DimensionKey;
  onSelectDimension: (key: DimensionKey) => void;
};

export function CoverageRadarCard(props: CoverageRadarCardProps) {
  const { dimensions, selectedDimension, onSelectDimension } = props;
  if (!dimensions.length) {
    return (
      <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <h2 className="text-lg font-semibold">Topic 覆盖率雷达图</h2>
        <p className="mt-3 text-xs text-slate-400">暂无覆盖率数据。</p>
      </article>
    );
  }
  const selectedRadar =
    dimensions.find((item) => item.key === selectedDimension) ?? dimensions[0];

  const radarPolygon = dimensions
    .map((dimension, index) => {
      const point = radarPoint(dimension.value, index, dimensions.length);
      return `${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">Topic 覆盖率雷达图</h2>
      <p className="mt-1 text-xs text-slate-400">点击维度可查看分类明细。</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
        <svg viewBox="0 0 220 220" className="h-56 w-full">
          <polygon
            points="110,20 200,110 110,200 20,110"
            fill="none"
            stroke="rgba(148,163,184,0.35)"
          />
          <polygon
            points="110,55 165,110 110,165 55,110"
            fill="none"
            stroke="rgba(148,163,184,0.25)"
          />
          <polygon
            points={radarPolygon}
            fill="rgba(96,165,250,0.3)"
            stroke="rgba(96,165,250,0.95)"
            strokeWidth={2}
          />
          {dimensions.map((dimension, index) => {
            const p = radarPoint(dimension.value, index, dimensions.length);
            return (
              <circle
                key={`${dimension.key}-${index}`}
                cx={p.x}
                cy={p.y}
                r={selectedDimension === dimension.key ? 6 : 4}
                fill={
                  selectedDimension === dimension.key ? "#a78bfa" : "#60a5fa"
                }
                className="cursor-pointer"
                onClick={() => onSelectDimension(dimension.key)}
              />
            );
          })}
        </svg>

        <div className="space-y-2">
          {dimensions.map((dimension) => (
            <button
              key={`${dimension.key}-${dimension.label}`}
              type="button"
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                selectedDimension === dimension.key
                  ? "border-blue-400/60 bg-blue-500/10 text-blue-200"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
              }`}
              onClick={() => onSelectDimension(dimension.key)}
            >
              <span>{dimension.label}</span>
              <span>{dimension.value}%</span>
            </button>
          ))}
          <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/80 p-3">
            <div className="text-xs text-slate-400">{selectedRadar.label} 明细</div>
            <div className="mt-2 space-y-1 text-sm">
              {selectedRadar.detail.map((item) => (
                <div key={item.name} className="flex justify-between">
                  <span className="text-slate-300">{item.name}</span>
                  <span className="text-slate-100">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
