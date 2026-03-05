import { AnalyticsTopicCorrelationView } from "@/lib/analytics-api";

type TopicCorrelationCardProps = {
  correlation: AnalyticsTopicCorrelationView | null;
};

export function TopicCorrelationCard({ correlation }: TopicCorrelationCardProps) {
  const rows = correlation?.correlation?.slice(0, 12) ?? [];
  const topicNameMap = new Map(
    (correlation?.topics ?? []).map((item) => [item.topicId, item.topicName])
  );

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">Topic Correlation</h2>
      <p className="mt-1 text-xs text-slate-400">Lightweight co-occurrence (Jaccard-like).</p>
      {!rows.length ? (
        <div className="mt-4 text-xs text-slate-400">No correlation data.</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="px-2 py-2 text-left">Topic A</th>
                <th className="px-2 py-2 text-left">Topic B</th>
                <th className="px-2 py-2 text-left">cooccurDocs</th>
                <th className="px-2 py-2 text-left">score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, idx) => (
                <tr
                  key={`${item.topicA}-${item.topicB}-${idx}`}
                  className="border-t border-slate-800"
                >
                  <td className="px-2 py-2 text-slate-300">
                    {topicNameMap.get(item.topicA) ?? item.topicA}
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {topicNameMap.get(item.topicB) ?? item.topicB}
                  </td>
                  <td className="px-2 py-2 text-slate-300">{item.cooccurDocs}</td>
                  <td className="px-2 py-2 text-slate-300">
                    {Number(item.score ?? 0).toFixed(3)}
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
