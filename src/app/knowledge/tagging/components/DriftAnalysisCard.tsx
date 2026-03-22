import Link from "next/link";
import { t } from "@/i18n";
import { AnalyticsMatrixDiffView } from "@/lib/analytics-api";

type DriftAnalysisCardProps = {
  drift: AnalyticsMatrixDiffView | null;
};

export function DriftAnalysisCard({ drift }: DriftAnalysisCardProps) {
  const rows = drift?.changedCells?.slice(0, 12) ?? [];

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">{t("governance.card.drift.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">
        {t("governance.card.drift.subtitle")}
      </p>
      {!drift ? (
        <div className="mt-4 text-xs text-slate-400">{t("governance.card.drift.empty")}</div>
      ) : (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <article className="rounded-lg border border-slate-700 bg-slate-950/80 p-3">
              <div className="text-xs text-slate-400">
                {t("governance.card.drift.metrics.version")}
              </div>
              <div className="mt-1 text-sm text-white">
                {drift.fromVersion} {"->"} {drift.toVersion}
              </div>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-950/80 p-3">
              <div className="text-xs text-slate-400">
                {t("governance.card.drift.metrics.added")}
              </div>
              <div className="mt-1 text-sm text-emerald-300">{drift.addedCount}</div>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-950/80 p-3">
              <div className="text-xs text-slate-400">
                {t("governance.card.drift.metrics.removed")}
              </div>
              <div className="mt-1 text-sm text-rose-300">{drift.removedCount}</div>
            </article>
            <article className="rounded-lg border border-slate-700 bg-slate-950/80 p-3">
              <div className="text-xs text-slate-400">
                {t("governance.card.drift.metrics.changeRate")}
              </div>
              <div className="mt-1 text-sm text-blue-200">
                {Number(drift.changeRate ?? 0).toFixed(2)}%
              </div>
            </article>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="px-2 py-2 text-left">
                    {t("governance.card.drift.columns.docId")}
                  </th>
                  <th className="px-2 py-2 text-left">
                    {t("governance.card.drift.columns.topicId")}
                  </th>
                  <th className="px-2 py-2 text-left">
                    {t("governance.card.drift.columns.status")}
                  </th>
                  <th className="px-2 py-2 text-left">
                    {t("governance.card.drift.columns.fromWeight")}
                  </th>
                  <th className="px-2 py-2 text-left">
                    {t("governance.card.drift.columns.toWeight")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, idx) => (
                  <tr
                    key={`${item.docId}-${item.topicId}-${item.status}-${idx}`}
                    className="border-t border-slate-800"
                  >
                    <td className="px-2 py-2 text-slate-300">{item.docId}</td>
                    <td className="px-2 py-2 text-slate-300">{item.topicId}</td>
                    <td
                      className={`px-2 py-2 ${
                        item.status === "ADDED" ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {item.status}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {item.fromWeight == null ? "-" : Number(item.fromWeight).toFixed(3)}
                    </td>
                    <td className="px-2 py-2 text-slate-300">
                      {item.toWeight == null ? "-" : Number(item.toWeight).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows[0] ? (
            <Link
              href={`/knowledge/governance/topic/${encodeURIComponent(rows[0].topicId)}`}
              className="mt-3 inline-flex text-xs text-blue-300 underline"
            >
              {t("governance.card.drift.openLink")}
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
