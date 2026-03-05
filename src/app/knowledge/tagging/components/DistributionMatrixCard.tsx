import Link from "next/link";
import { HeatCell } from "@/store/useSemanticGovernanceStore";
import { heatColor } from "../dashboard-utils";
import {
  AnalyticsMatrixCellView,
  AnalyticsMatrixColumnTotalView,
  AnalyticsMatrixDocView,
  AnalyticsMatrixRowTotalView,
  AnalyticsMatrixTopicView,
} from "@/lib/analytics-api";
import { t } from "@/i18n";

type DistributionMatrixCardProps = {
  datasetName?: string;
  docs: AnalyticsMatrixDocView[];
  topics: AnalyticsMatrixTopicView[];
  cells?: AnalyticsMatrixCellView[];
  rowTotals?: AnalyticsMatrixRowTotalView[];
  columnTotals?: AnalyticsMatrixColumnTotalView[];
  selectedHeatCell: HeatCell | null;
  onSelectHeatCell: (cell: HeatCell | null) => void;
};

export function DistributionMatrixCard(props: DistributionMatrixCardProps) {
  const {
    datasetName,
    docs,
    topics,
    cells,
    rowTotals,
    columnTotals,
    selectedHeatCell,
    onSelectHeatCell,
  } = props;

  const topicColumns = topics.slice(0, 10);
  const rows = docs.slice(0, 50);

  const topicNameById = new Map(
    topicColumns.map((topic) => [topic.topicId, topic.topicName])
  );
  const weightMap = new Map<string, number>();
  const rowTotalsMap = new Map((rowTotals ?? []).map((item) => [item.docId, item]));
  const columnTotalsMap = new Map(
    (columnTotals ?? []).map((item) => [item.topicId, item])
  );

  let maxWeight = 0;
  (cells ?? []).forEach((cell) => {
    const key = `${cell.docId}::${cell.topicId}`;
    const weight = Number(cell.weight) || 0;
    weightMap.set(key, weight);
    maxWeight = Math.max(maxWeight, weight);
  });
  const hasCellWeights = weightMap.size > 0 && maxWeight > 0;

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">{t("governance.control.heatmap.title")}</h2>
      <p className="mt-1 text-xs text-slate-400">
        {t("governance.control.heatmap.subtitle")}
        {datasetName ? ` ${t("governance.control.heatmap.dataset")}: ${datasetName}` : ""}
      </p>
      {!rows.length ? (
        <div className="mt-4 text-xs text-slate-400">{t("governance.control.heatmap.noData")}</div>
      ) : null}
      {selectedHeatCell ? (
        <div className="mt-3 rounded-md border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
          {t("governance.control.heatmap.selected")}: {selectedHeatCell.docId} /{" "}
          {topicNameById.get(selectedHeatCell.topicId) ?? selectedHeatCell.topicName}
        </div>
      ) : null}
      <div className="mt-4 max-h-[30rem] overflow-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="px-2 py-2 text-left">{t("governance.control.heatmap.document")}</th>
              {topicColumns.map((topic) => (
                <th key={topic.topicId} className="px-2 py-2 text-left">
                  {topic.topicName}
                </th>
              ))}
              <th className="px-2 py-2 text-left">{t("governance.control.heatmap.density")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((doc) => (
              <tr key={doc.docId} className="border-t border-slate-800">
                <td className="px-2 py-2">
                  <div className="max-w-[260px] truncate text-slate-100">
                    {doc.title?.trim() || doc.docId}
                  </div>
                  {doc.title ? (
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {doc.docId}
                    </div>
                  ) : null}
                </td>
                {topicColumns.map((topic) => {
                  const topicId = topic.topicId;
                  const rawWeight = weightMap.get(`${doc.docId}::${topicId}`) ?? 0;
                  const selected =
                    selectedHeatCell?.docId === doc.docId &&
                    selectedHeatCell?.topicId === topicId;
                  const intensity = hasCellWeights
                    ? rawWeight > 0
                      ? 0.1 + Math.min(0.9, rawWeight / maxWeight)
                      : 0.05
                    : rawWeight > 0
                      ? 0.9
                      : 0.08;
                  return (
                    <td key={`${doc.docId}-${topicId}`} className="px-2 py-2">
                      <button
                        type="button"
                        aria-pressed={selected}
                        className={`h-7 w-11 rounded border transition ${
                          selected
                            ? "border-cyan-300 ring-2 ring-cyan-300/60"
                            : "border-slate-700 hover:border-slate-500"
                        }`}
                        style={{ backgroundColor: heatColor(intensity) }}
                        onClick={() => {
                          if (selected) {
                            onSelectHeatCell(null);
                            return;
                          }
                          onSelectHeatCell({
                            docId: doc.docId,
                            topicId,
                            topicName: topic.topicName,
                            intensity,
                            explain: hasCellWeights
                              ? `${doc.docId} on ${topic.topicName} weight ${(
                                  rawWeight || 0
                                ).toFixed(3)} (normalized ${(intensity * 100).toFixed(
                                  0
                                )}%).`
                              : `${doc.docId} hit ${topic.topicName} at ${(
                                  intensity * 100
                                ).toFixed(0)}%.`,
                          });
                        }}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-slate-300">
                  {(rowTotalsMap.get(doc.docId)?.topicCount ?? 0).toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {topicColumns.length ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {topicColumns.slice(0, 4).map((topic) => {
            const stats = columnTotalsMap.get(topic.topicId);
            return (
              <div
                key={`stats-${topic.topicId}`}
                className="rounded border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs"
              >
                <div className="text-slate-200">{topic.topicName}</div>
                <div className="mt-1 text-slate-400">
                  {t("governance.control.heatmap.docs")}: {stats?.docCount ?? 0} | {t("governance.control.heatmap.avgWeight")}: {Number(stats?.avgWeight ?? 0).toFixed(3)}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {selectedHeatCell ? (
        <div className="mt-4 rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-xs">
          <div className="font-medium text-blue-200">
            {selectedHeatCell.docId} / {topicNameById.get(selectedHeatCell.topicId) ?? selectedHeatCell.topicName}
          </div>
          <div className="mt-1 text-slate-300">{selectedHeatCell.explain}</div>
          <Link
            href={`/knowledge/governance/topic/${encodeURIComponent(
              selectedHeatCell.topicId
            )}?topicName=${encodeURIComponent(
              topicNameById.get(selectedHeatCell.topicId) ?? selectedHeatCell.topicName
            )}&docId=${encodeURIComponent(selectedHeatCell.docId)}`}
            className="mt-2 inline-flex text-blue-300 underline"
          >
            {t("governance.control.heatmap.openSearchPortal")}
          </Link>
        </div>
      ) : null}
    </article>
  );
}
