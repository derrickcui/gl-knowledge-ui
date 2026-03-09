"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { getLocale, t } from "@/i18n";

type DriftTab =
  | "health"
  | "coverage"
  | "overlap"
  | "unmapped"
  | "keywords"
  | "impact"
  | "suggestions"
  | "history";

type HealthSummary = {
  score?: number | null;
  trend?: "UP" | "DOWN" | "FLAT" | null;
  snapshotDate?: string | null;
};

type LiveSummary = {
  totalDocs?: number;
  classifiedDocs: number;
  unmappedDocs: number;
  coverageRatio: number;
  overlapCount: number;
} | null;

type CoverageRow = {
  topicId?: string | null;
  topicName?: string | null;
  currentDocs: number;
  previousDocs: number;
  changeRate?: number | null;
};

type OverlapRow = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
};

type KeywordRow = {
  term: string;
  frequency: number;
  score?: number | null;
};

type ImpactRow = {
  id: string;
  type: "Coverage" | "Overlap" | "Keyword";
  item: string;
  impactScore: number;
  actionLabel: string;
  onAction: () => void;
};

type SuggestionRow = {
  id: string;
  suggestedTopic: string;
  docs: number;
  confidence: number;
  onAction: () => void;
};

type HistoryRow = {
  snapshotDate: string;
  coverageRatio: number;
  unmappedDocs: number;
  overlapDocCount: number;
  healthScore: number;
};

export function DriftWorkspace({
  topicSetName,
  datasetName,
  lastAnalysis,
  health,
  liveSummary,
  coverageRows,
  overlapRows,
  unmappedTotal,
  keywords,
  impactRows,
  suggestionRows,
  history,
  analyzing,
  onAnalyze,
  onOpenCoverageTopic,
  onOpenOverlap,
  onOpenUnmapped,
  onOpenKeyword,
}: {
  topicSetName?: string | null;
  datasetName?: string | null;
  lastAnalysis?: string | null;
  health: HealthSummary | null;
  liveSummary: LiveSummary;
  coverageRows: CoverageRow[];
  overlapRows: OverlapRow[];
  unmappedTotal: number;
  keywords: KeywordRow[];
  impactRows: ImpactRow[];
  suggestionRows: SuggestionRow[];
  history: HistoryRow[];
  analyzing: boolean;
  onAnalyze: () => void;
  onOpenCoverageTopic: (row: CoverageRow) => void;
  onOpenOverlap: (row: OverlapRow) => void;
  onOpenUnmapped: () => void;
  onOpenKeyword: (keyword: string) => void;
}) {
  const [tab, setTab] = useState<DriftTab>("health");
  const locale = getLocale();
  const trendBars = history.slice(-6);
  const maxUnmapped = Math.max(1, ...trendBars.map((item) => item.unmappedDocs));
  const maxOverlap = Math.max(1, ...trendBars.map((item) => item.overlapDocCount));
  const tabItems = useMemo(
    () =>
      [
        "health",
        "coverage",
        "overlap",
        "unmapped",
        "keywords",
        "impact",
        "suggestions",
        "history",
      ] as DriftTab[],
    []
  );
  const tabLabels: Record<DriftTab, string> = {
    health: t("topicSet.drift.tab.health"),
    coverage: t("topicSet.drift.tab.coverage"),
    overlap: t("topicSet.drift.tab.overlap"),
    unmapped: t("topicSet.drift.tab.unmapped"),
    keywords: t("topicSet.drift.tab.keywords"),
    impact: t("topicSet.drift.tab.impact"),
    suggestions: t("topicSet.drift.tab.suggestions"),
    history: t("topicSet.drift.tab.history"),
  };

  return (
    <section className="space-y-4">
      <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f7f4ea_0%,#ffffff_40%,#eef6ff_100%)] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              {t("topicSet.ruleHealth.title")}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <div>
                {t("topicSet.drift.topicSet")}:{" "}
                <span className="font-medium text-slate-900">{topicSetName || "-"}</span>
              </div>
              <div>
                {t("topicSet.drift.dataset")}:{" "}
                <span className="font-medium text-slate-900">{datasetName || "-"}</span>
              </div>
              <div>
                {t("topicSet.drift.lastRun")}:{" "}
                <span className="font-medium text-slate-900">
                  {formatDate(lastAnalysis, locale)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={onAnalyze}
            disabled={analyzing}
          >
            {analyzing ? t("topicSet.drift.running") : t("topicSet.drift.runAnalysis")}
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-white px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {tabItems.map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm ${
                item === tab ? "bg-black text-white" : "hover:bg-muted"
              }`}
              onClick={() => setTab(item)}
            >
              {tabLabels[item]}
            </button>
          ))}
        </div>
      </section>

      {tab === "health" && (
        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title={t("topicSet.drift.health.title")}>
            <div className="text-5xl font-semibold tracking-tight text-slate-950">
              {health?.score != null ? `${health.score} / 100` : "--"}
            </div>
            <div className="mt-3 text-sm text-slate-600">
              {t("topicSet.drift.trend")}: {formatTrend(health?.trend)}
            </div>
          </Panel>
          <Panel title={t("topicSet.drift.overview.title")}>
            <div className="space-y-3">
              <MetricLine
                label={t("topicSet.drift.coverageRatio")}
                value={formatRatio(liveSummary?.coverageRatio)}
              />
              <MetricLine label={t("topicSet.drift.unmappedDocs")} value={String(unmappedTotal)} />
              <MetricLine
                label={t("topicSet.drift.overlapPairs")}
                value={String(liveSummary?.overlapCount ?? 0)}
              />
            </div>
          </Panel>
        </section>
      )}

      {tab === "coverage" && (
        <ActionTable
          title={t("topicSet.drift.coverage.title")}
          columns={[t("common.topic"), t("topicSet.drift.docs"), t("topicSet.drift.trend")]}
          rows={coverageRows.map((row) => ({
            key: row.topicId ?? row.topicName ?? "topic",
            cells: [
              row.topicName ?? row.topicId ?? "-",
              String(row.currentDocs),
              renderTrend(row.changeRate),
            ],
            onClick: () => onOpenCoverageTopic(row),
            actionLabel: t("topicSet.drift.viewDocs"),
          }))}
          emptyText={t("topicSet.drift.coverage.empty")}
        />
      )}

      {tab === "overlap" && (
        <ActionTable
          title={t("topicSet.drift.overlap.title")}
          columns={[
            t("topicSet.drift.topicA"),
            t("topicSet.drift.topicB"),
            t("topicSet.drift.docs"),
          ]}
          rows={overlapRows.map((row) => ({
            key: `${row.topicAId}:${row.topicBId}`,
            cells: [
              row.topicAName ?? row.topicAId,
              row.topicBName ?? row.topicBId,
              String(row.overlapDocs),
            ],
            onClick: () => onOpenOverlap(row),
            actionLabel: t("topicSet.drift.viewOverlapDocs"),
          }))}
          emptyText={t("topicSet.drift.overlap.empty")}
        />
      )}

      {tab === "unmapped" && (
        <Panel title={t("topicSet.drift.unmapped.title")}>
          <div className="text-4xl font-semibold tracking-tight text-slate-950">{unmappedTotal}</div>
          <div className="mt-2 text-sm text-slate-600">{t("topicSet.drift.currentUnmapped")}</div>
          <button
            type="button"
            className="mt-5 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={onOpenUnmapped}
          >
            {t("topicSet.drift.viewUnmappedDocuments")}
          </button>
        </Panel>
      )}

      {tab === "keywords" && (
        <ActionTable
          title={t("topicSet.drift.keywords.title")}
          columns={[t("topicSet.drift.keyword"), t("topicSet.drift.frequency")]}
          rows={keywords.map((row) => ({
            key: row.term,
            cells: [row.term, String(row.frequency)],
            onClick: () => onOpenKeyword(row.term),
            actionLabel: t("topicSet.drift.searchDocs"),
          }))}
          emptyText={t("topicSet.drift.keywords.empty")}
        />
      )}

      {tab === "impact" && (
        <ActionTable
          title={t("topicSet.drift.impact.title")}
          columns={[
            t("topicSet.drift.type"),
            t("topicSet.drift.item"),
            t("topicSet.drift.impactScore"),
          ]}
          rows={impactRows.map((row) => ({
            key: row.id,
            cells: [row.type, row.item, String(row.impactScore)],
            onClick: row.onAction,
            actionLabel: row.actionLabel,
          }))}
          emptyText={t("topicSet.drift.impact.empty")}
        />
      )}

      {tab === "suggestions" && (
        <ActionTable
          title={t("topicSet.drift.suggestions.title")}
          columns={[
            t("topicSet.drift.suggestedTopic"),
            t("topicSet.drift.docs"),
            t("topicSet.drift.confidence"),
          ]}
          rows={suggestionRows.map((row) => ({
            key: row.id,
            cells: [row.suggestedTopic, String(row.docs), row.confidence.toFixed(2)],
            onClick: row.onAction,
            actionLabel: t("topicSet.drift.viewDocs"),
          }))}
          emptyText={t("topicSet.drift.suggestions.empty")}
        />
      )}

      {tab === "history" && (
        <section className="grid gap-5 xl:grid-cols-3">
          <Panel title={t("topicSet.drift.history.coverageRatio")}>
            <div className="space-y-3">
              {trendBars.map((item) => (
                <TrendRow
                  key={`coverage-${item.snapshotDate}`}
                  label={formatMonth(item.snapshotDate, locale)}
                  width={Math.max(8, Math.round((item.coverageRatio ?? 0) * 100))}
                  value={formatRatio(item.coverageRatio)}
                />
              ))}
            </div>
          </Panel>
          <Panel title={t("topicSet.drift.history.unmappedDocs")}>
            <div className="space-y-3">
              {trendBars.map((item) => (
                <TrendRow
                  key={`unmapped-${item.snapshotDate}`}
                  label={formatMonth(item.snapshotDate, locale)}
                  width={Math.max(
                    8,
                    Math.round((item.unmappedDocs / Math.max(maxUnmapped, 1)) * 100)
                  )}
                  value={String(item.unmappedDocs)}
                />
              ))}
            </div>
          </Panel>
          <Panel title={t("topicSet.drift.history.overlapDocs")}>
            <div className="space-y-3">
              {trendBars.map((item) => (
                <TrendRow
                  key={`overlap-${item.snapshotDate}`}
                  label={formatMonth(item.snapshotDate, locale)}
                  width={Math.max(
                    8,
                    Math.round((item.overlapDocCount / Math.max(maxOverlap, 1)) * 100)
                  )}
                  value={String(item.overlapDocCount)}
                />
              ))}
            </div>
          </Panel>
        </section>
      )}
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </div>
      {children}
    </section>
  );
}

function ActionTable({
  title,
  columns,
  rows,
  emptyText,
}: {
  title: string;
  columns: string[];
  rows: Array<{ key: string; cells: string[]; onClick: () => void; actionLabel?: string }>;
  emptyText: string;
}) {
  const showActionColumn = rows.some((row) => row.actionLabel);

  return (
    <Panel title={title}>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
              {showActionColumn ? (
                <th className="px-4 py-3">{t("topicSet.drift.action")}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-200">
                {row.cells.map((cell, index) => (
                  <td key={`${row.key}-${index}`} className="px-4 py-3 text-slate-700">
                    {cell}
                  </td>
                ))}
                {row.actionLabel ? (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={row.onClick}
                    >
                      {row.actionLabel}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-slate-500"
                  colSpan={columns.length + (showActionColumn ? 1 : 0)}
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function TrendRow({ label, width, value }: { label: string; width: number; value: string }) {
  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="h-3 rounded-full bg-slate-200">
        <div className="h-3 rounded-full bg-slate-900" style={{ width: `${width}%` }} />
      </div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { month: "2-digit", day: "2-digit" });
}

function formatMonth(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { month: "short" });
}

function formatRatio(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "--";
  return value.toFixed(2);
}

function formatTrend(value?: "UP" | "DOWN" | "FLAT" | null) {
  if (value === "UP") return t("topicSet.drift.trend.up");
  if (value === "DOWN") return t("topicSet.drift.trend.down");
  if (value === "FLAT") return t("topicSet.drift.trend.flat");
  return "--";
}

function renderTrend(changeRate?: number | null) {
  if (changeRate == null || Number.isNaN(changeRate)) return "--";
  if (changeRate > 0.05) return t("topicSet.drift.trend.up");
  if (changeRate < -0.05) return t("topicSet.drift.trend.down");
  return t("topicSet.drift.trend.flat");
}
