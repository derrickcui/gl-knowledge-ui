import { t } from "@/i18n";
import { AnalyticsTopicStatsView } from "@/lib/analytics-api";

type TopicStatsCardProps = {
  stats: AnalyticsTopicStatsView | null;
};

export function TopicStatsCard({ stats }: TopicStatsCardProps) {
  const rows = stats?.topics?.slice(0, 10) ?? [];

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">{t("governance.card.topicStats.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">
        {t("governance.card.topicStats.subtitle")}
      </p>
      {!rows.length ? (
        <div className="mt-4 text-xs text-slate-400">
          {t("governance.card.topicStats.empty")}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="px-2 py-2 text-left">
                  {t("governance.card.topicStats.columns.topic")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.topicStats.columns.dimension")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.topicStats.columns.docCount")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.topicStats.columns.avgWeight")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.topicStats.columns.coverageRate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.topicId} className="border-t border-slate-800">
                  <td className="px-2 py-2 text-slate-300">{item.topicName}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {item.dimensionName ?? item.dimensionId ?? "-"}
                  </td>
                  <td className="px-2 py-2 text-slate-300">{item.docCount}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {Number(item.avgWeight ?? 0).toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {(Number(item.coverageRate ?? 0) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
