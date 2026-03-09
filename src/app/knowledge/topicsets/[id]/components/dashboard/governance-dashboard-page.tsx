"use client";

import { t } from "@/i18n";
import type { ReactNode } from "react";

type HealthSummary = {
  score?: number | null;
  trend?: "UP" | "DOWN" | "FLAT" | null;
  snapshotDate?: string | null;
};

type LiveSummary = {
  classifiedDocs: number;
  unmappedDocs: number;
  coverageRatio: number;
  overlapCount: number;
} | null;

type CoverageDriftRow = {
  topicId?: string | null;
  topicName?: string | null;
  docCount: number;
};

type OverlapDriftRow = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
};

type DriftKeywordRow = {
  term: string;
  frequency: number;
  score?: number | null;
};

type UnmappedGrowth = {
  previous: number;
  current: number;
  change: number;
} | null;

export function GovernanceDashboardPage({
  topicSetName,
  datasetName,
  lastAnalysis,
  health,
  liveSummary,
  coverageRows,
  overlapRows,
  unmappedGrowth,
  keywords,
  isDraftRuntime,
  onOpenCoverage,
  onOpenOverlapDocs,
  onOpenUnmapped,
  onOpenKeyword,
}: {
  topicSetName?: string | null;
  datasetName?: string | null;
  lastAnalysis?: string | null;
  health: HealthSummary | null;
  liveSummary: LiveSummary;
  coverageRows: CoverageDriftRow[];
  overlapRows: OverlapDriftRow[];
  unmappedGrowth: UnmappedGrowth;
  keywords: DriftKeywordRow[];
  isDraftRuntime: boolean;
  onOpenCoverage: () => void;
  onOpenOverlapDocs: (row: OverlapDriftRow) => void;
  onOpenUnmapped: () => void;
  onOpenKeyword: (keyword: string) => void;
}) {
  const trendTone =
    health?.trend === "UP" ? "text-emerald-700" : health?.trend === "DOWN" ? "text-rose-700" : "text-slate-700";
  const totalDocs = (liveSummary?.classifiedDocs ?? 0) + (liveSummary?.unmappedDocs ?? 0);

  return (
    <section className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7f4ea_0%,#ffffff_40%,#eef6ff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {t("topicSet.ruleHealth.eyebrow")}
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{t("topicSet.ruleHealth.title")}</h2>
          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
            <div>
              {t("topicSet.dashboard.topicSet")}: <span className="font-medium text-slate-900">{topicSetName || "-"}</span>
            </div>
            <div>
              Dataset: <span className="font-medium text-slate-900">{datasetName || "-"}</span>
            </div>
            <div>
              {t("topicSet.ruleHealth.snapshotDate")}:{" "}
              <span className="font-medium text-slate-900">{lastAnalysis ? formatDateLabel(lastAnalysis) : "--"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <MetricPanel
          title={t("topicSet.ruleHealth.healthScore")}
          apiPath="GET /api/topicsets/{id}/drift + /drift-health"
        >
          <div className="text-4xl font-semibold tracking-tight text-slate-950">
            {health?.score != null ? `${health.score} / 100` : "--"}
          </div>
          <div className={`mt-2 text-sm ${trendTone}`}>
            {health?.trend === "UP"
              ? "Up"
              : health?.trend === "DOWN"
              ? "Down"
              : health?.trend === "FLAT"
              ? "Flat"
              : isDraftRuntime
              ? t("topicSet.ruleHealth.draftOnlyHint")
              : t("topicSet.ruleHealth.noHealthData")}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
            <DataPoint label={t("topicSet.ruleHealth.liveCoverage")} value={formatPercent(liveSummary?.coverageRatio)} />
            <DataPoint label={t("topicSet.ruleHealth.liveUnmapped")} value={String(liveSummary?.unmappedDocs ?? 0)} />
            <DataPoint label={t("topicSet.ruleHealth.liveOverlapCount", { count: liveSummary?.overlapCount ?? 0 })} value={String(totalDocs)} />
          </div>
        </MetricPanel>

        <MetricPanel
          title={t("topicSet.ruleHealth.unmappedGrowth")}
          apiPath="GET /api/topicsets/{id}/drift-history"
          actionLabel={t("topicSet.dashboard.openUnmapped")}
          onAction={onOpenUnmapped}
        >
          <div className="text-4xl font-semibold tracking-tight text-slate-950">
            {unmappedGrowth ? formatSigned(unmappedGrowth.change) : "--"}
          </div>
          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <DataPoint label="Previous" value={unmappedGrowth ? String(unmappedGrowth.previous) : "--"} />
            <DataPoint label="Current" value={unmappedGrowth ? String(unmappedGrowth.current) : String(liveSummary?.unmappedDocs ?? 0)} />
          </div>
        </MetricPanel>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <SectionHeader
          title="Coverage Drift"
          apiPath="GET /api/topicsets/{id}/drift/coverage"
          actionLabel="View Details"
          onAction={onOpenCoverage}
        />
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Current Docs</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.slice(0, 8).map((row) => (
                <tr key={row.topicId ?? row.topicName ?? "topic"} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">{row.topicName ?? row.topicId ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{row.docCount}</td>
                </tr>
              ))}
              {coverageRows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={2}>
                    {isDraftRuntime ? t("topicSet.ruleHealth.draftTrendHint") : t("topicSet.analytics.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <SectionHeader title={t("topicSet.analytics.overlapTitle")} apiPath="GET /api/topicsets/{id}/drift/overlap" />
        <div className="space-y-3">
          {overlapRows.slice(0, 6).map((row) => (
            <button
              key={`${row.topicAId}:${row.topicBId}`}
              type="button"
              onClick={() => onOpenOverlapDocs(row)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-900 hover:bg-slate-50"
            >
              <div className="min-w-0 pr-4 text-sm text-slate-700">
                <span className="font-medium text-slate-950">{row.topicAName ?? row.topicAId}</span>
                <span className="mx-2 text-slate-400">↔</span>
                <span className="font-medium text-slate-950">{row.topicBName ?? row.topicBId}</span>
              </div>
              <div className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                {row.overlapDocs} {t("topicSet.coverage.docsUnit")}
              </div>
            </button>
          ))}
          {overlapRows.length === 0 && <EmptyState text={t("topicSet.analytics.noOverlap")} />}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <MetricPanel
          title="Unmapped Growth"
          apiPath="GET /api/topicsets/{id}/drift-history + /api/topicsets/{id}/unmapped"
          actionLabel={t("topicSet.dashboard.openUnmapped")}
          onAction={onOpenUnmapped}
        >
          <div className="text-4xl font-semibold tracking-tight text-slate-950">{String(liveSummary?.unmappedDocs ?? 0)}</div>
          <div className="mt-2 text-sm text-slate-600">{t("topicSet.analytics.unmapped", { count: liveSummary?.unmappedDocs ?? 0 })}</div>
        </MetricPanel>

        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <SectionHeader title={t("topicSet.ruleHealth.keywordDrift")} apiPath="GET /api/topicsets/{id}/drift/keywords" />
          <div className="space-y-2">
            {keywords.slice(0, 8).map((keyword) => (
              <button
                key={keyword.term}
                type="button"
                onClick={() => onOpenKeyword(keyword.term)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffef7_0%,#ffffff_100%)] px-4 py-3 text-left transition hover:border-slate-900 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-slate-950">{keyword.term}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {t("topicSet.ruleHealth.keywordFrequency", { count: keyword.frequency })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">{t("topicSet.ruleHealth.keywordScore")}</div>
                  <div className="text-sm font-semibold text-amber-700">{keyword.score?.toFixed(2) ?? "--"}</div>
                </div>
              </button>
            ))}
            {keywords.length === 0 && <EmptyState text={t("topicSet.ruleHealth.noKeywords")} />}
          </div>
        </section>
      </section>
    </section>
  );
}

function MetricPanel({
  title,
  apiPath,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  apiPath: string;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <SectionHeader title={title} apiPath={apiPath} actionLabel={actionLabel} onAction={onAction} />
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  apiPath,
  actionLabel,
  onAction,
}: {
  title: string;
  apiPath: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
        <div className="mt-1 text-xs text-slate-400">{apiPath}</div>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">{text}</div>;
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "--";
  return `${Math.round(value * 100)}%`;
}

function formatSigned(value: number) {
  if (!Number.isFinite(value)) return "--";
  return value > 0 ? `+${value}` : String(value);
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
