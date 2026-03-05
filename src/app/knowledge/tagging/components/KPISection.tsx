import { AnalyticsOverviewView } from "@/lib/analytics-api";

type KPISectionProps = {
  overview: AnalyticsOverviewView | null;
};

export function KPISection({ overview }: KPISectionProps) {
  const kpiCards = [
    {
      label: "Docs",
      value: overview ? overview.totalDocs.toLocaleString() : "-",
      note: "文档总规模",
    },
    {
      label: "Topics",
      value: overview ? overview.totalTopics.toLocaleString() : "-",
      note: "已部署主题",
    },
    {
      label: "Coverage",
      value: overview ? `${overview.coverageRate.toFixed(2)}%` : "-",
      note: "标注覆盖率",
    },
    {
      label: "Runtime",
      value: overview?.runtimeVersion ?? "-",
      note: "运行版本",
    },
  ];

  return (
    <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpiCards.map((card) => (
        <article
          key={card.label}
          className="rounded-xl border border-slate-700 bg-slate-900/80 p-4"
        >
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {card.label}
          </div>
          <div className="mt-2 text-3xl font-semibold text-white">{card.value}</div>
          <div className="mt-1 text-xs text-slate-400">{card.note}</div>
        </article>
      ))}
    </section>
  );
}
