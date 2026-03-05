import { AnalyticsTopicStatsView } from "@/lib/analytics-api";

type TopicStatsCardProps = {
  stats: AnalyticsTopicStatsView | null;
};

export function TopicStatsCard({ stats }: TopicStatsCardProps) {
  const rows = stats?.topics?.slice(0, 10) ?? [];

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">Topic Quality Stats</h2>
      <p className="mt-1 text-xs text-slate-400">
        docCount, avgWeight, coverageRate.
      </p>
      {!rows.length ? (
        <div className="mt-4 text-xs text-slate-400">No topic stats data.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="px-2 py-2 text-left">Topic</th>
                <th className="px-2 py-2 text-left">Dimension</th>
                <th className="px-2 py-2 text-left">docCount</th>
                <th className="px-2 py-2 text-left">avgWeight</th>
                <th className="px-2 py-2 text-left">coverageRate</th>
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
