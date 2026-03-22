import { t } from "@/i18n";
import { AnalyticsDocStatsView } from "@/lib/analytics-api";

type DocStatsCardProps = {
  stats: AnalyticsDocStatsView | null;
};

export function DocStatsCard({ stats }: DocStatsCardProps) {
  const rows = stats?.docs?.slice(0, 10) ?? [];

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">{t("governance.card.docStats.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">
        {t("governance.card.docStats.subtitle")}
      </p>
      {!rows.length ? (
        <div className="mt-4 text-xs text-slate-400">
          {t("governance.card.docStats.empty")}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="px-2 py-2 text-left">
                  {t("governance.card.docStats.columns.docId")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.docStats.columns.title")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.docStats.columns.topicCount")}
                </th>
                <th className="px-2 py-2 text-left">
                  {t("governance.card.docStats.columns.avgWeight")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.docId} className="border-t border-slate-800">
                  <td className="px-2 py-2 text-slate-300">{item.docId}</td>
                  <td className="px-2 py-2 text-slate-300">{item.title ?? "-"}</td>
                  <td className="px-2 py-2 text-slate-300">{item.topicCount}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {Number(item.avgWeight ?? 0).toFixed(3)}
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
