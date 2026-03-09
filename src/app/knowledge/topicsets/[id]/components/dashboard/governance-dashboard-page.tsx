"use client";

import { t } from "@/i18n";
import type { ReactNode } from "react";

type DriftHistoryRow = {
  snapshotDate: string;
  coverageRatio: number;
  unmappedDocs: number;
  healthScore: number;
};

type DriftOverlapRow = {
  topicAId: string;
  topicAName?: string | null;
  topicBId: string;
  topicBName?: string | null;
  overlapDocs: number;
};

type DriftKeywordRow = {
  term: string;
  frequency: number;
  score: number;
};

type HealthSummary = {
  score: number | null;
  trend?: "UP" | "DOWN" | "FLAT" | null;
  snapshotDate?: string | null;
};

type LiveSummary = {
  classifiedDocs: number;
  unmappedDocs: number;
  coverageRatio: number;
  overlapCount: number;
} | null;

export function GovernanceDashboardPage({
  topicSetName,
  health,
  liveSummary,
  history,
  overlapRows,
  keywords,
  isDraftRuntime,
  onOpenOverlapDocs,
  onOpenUnmapped,
}: {
  topicSetName?: string | null;
  health: HealthSummary | null;
  liveSummary: LiveSummary;
  history: DriftHistoryRow[];
  overlapRows: DriftOverlapRow[];
  keywords: DriftKeywordRow[];
  isDraftRuntime: boolean;
  onOpenOverlapDocs: (row: DriftOverlapRow) => void;
  onOpenUnmapped: () => void;
}) {
  const recentHistory = history.slice(0, 6).reverse();
  const maxCoverage = Math.max(0.01, ...recentHistory.map((item) => item.coverageRatio || 0));
  const maxUnmapped = Math.max(1, ...recentHistory.map((item) => item.unmappedDocs || 0));
  const trendTone =
    health?.trend === "UP" ? "text-emerald-700" : health?.trend === "DOWN" ? "text-rose-700" : "text-slate-600";

  return (
    <section className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7f4ea_0%,#ffffff_42%,#eef6ff_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {t("topicSet.ruleHealth.eyebrow")}
            </div>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {t("topicSet.ruleHealth.title")}
            </h2>
            <div className="mt-2 text-sm text-slate-600">
              {t("topicSet.dashboard.topicSet")}: {topicSetName || "-"}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ScoreCard
              label={t("topicSet.ruleHealth.healthScore")}
              value={health?.score != null ? `${health.score} / 100` : "--"}
              hint={
                health?.snapshotDate
                  ? `${t("topicSet.ruleHealth.snapshotDate")} ${formatDateLabel(health.snapshotDate)}`
                  : isDraftRuntime
                  ? t("topicSet.ruleHealth.draftOnlyHint")
                  : t("topicSet.ruleHealth.noHealthData")
              }
              accentClass={trendTone}
            />
            <ScoreCard
              label={t("topicSet.ruleHealth.liveCoverage")}
              value={formatPercent(liveSummary?.coverageRatio)}
              hint={`${liveSummary?.classifiedDocs ?? 0} / ${Math.max(
                (liveSummary?.classifiedDocs ?? 0) + (liveSummary?.unmappedDocs ?? 0),
                0
              )} ${t("topicSet.coverage.docsUnit")}`}
            />
            <ScoreCard
              label={t("topicSet.ruleHealth.liveUnmapped")}
              value={String(liveSummary?.unmappedDocs ?? 0)}
              hint={t("topicSet.analytics.unmapped", { count: liveSummary?.unmappedDocs ?? 0 })}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title={t("topicSet.ruleHealth.coverageTrend")}>
          <div className="space-y-3">
            {recentHistory.length > 0 ? (
              recentHistory.map((item) => (
                <TrendBar
                  key={`coverage-${item.snapshotDate}`}
                  label={formatMonthLabel(item.snapshotDate)}
                  value={item.coverageRatio}
                  max={maxCoverage}
                  valueText={formatPercent(item.coverageRatio)}
                  fillClass="bg-slate-900"
                  trackClass="bg-slate-200"
                />
              ))
            ) : (
              <EmptyState text={isDraftRuntime ? t("topicSet.ruleHealth.draftTrendHint") : t("topicSet.ruleHealth.noTrendData")} />
            )}
          </div>
        </Panel>

        <Panel title={t("topicSet.ruleHealth.unmappedGrowth")}>
          <div className="space-y-3">
            {recentHistory.length > 0 ? (
              recentHistory.map((item) => (
                <TrendBar
                  key={`unmapped-${item.snapshotDate}`}
                  label={formatMonthLabel(item.snapshotDate)}
                  value={item.unmappedDocs}
                  max={maxUnmapped}
                  valueText={String(item.unmappedDocs)}
                  fillClass="bg-amber-500"
                  trackClass="bg-amber-100"
                />
              ))
            ) : (
              <EmptyState text={isDraftRuntime ? t("topicSet.ruleHealth.draftTrendHint") : t("topicSet.ruleHealth.noTrendData")} />
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel
          title={t("topicSet.analytics.overlapTitle")}
          action={
            <span className="text-xs text-slate-500">
              {t("topicSet.ruleHealth.liveOverlapCount", { count: liveSummary?.overlapCount ?? overlapRows.length })}
            </span>
          }
        >
          <div className="space-y-3">
            {overlapRows.length > 0 ? (
              overlapRows.slice(0, 6).map((row) => (
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
              ))
            ) : (
              <EmptyState text={t("topicSet.analytics.noOverlap")} />
            )}
          </div>
        </Panel>

        <Panel
          title={t("topicSet.ruleHealth.keywordDrift")}
          action={
            <button
              type="button"
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              onClick={onOpenUnmapped}
            >
              {t("topicSet.dashboard.openUnmapped")}
            </button>
          }
        >
          <div className="space-y-2">
            {keywords.length > 0 ? (
              keywords.slice(0, 6).map((keyword) => (
                <div
                  key={keyword.term}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#fffef7_0%,#ffffff_100%)] px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-950">{keyword.term}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {t("topicSet.ruleHealth.keywordFrequency", { count: keyword.frequency })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{t("topicSet.ruleHealth.keywordScore")}</div>
                    <div className="text-sm font-semibold text-amber-700">{keyword.score.toFixed(2)}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState text={t("topicSet.ruleHealth.noKeywords")} />
            )}
          </div>
        </Panel>
      </section>
    </section>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function ScoreCard({
  label,
  value,
  hint,
  accentClass,
}: {
  label: string;
  value: string;
  hint: string;
  accentClass?: string;
}) {
  return (
    <div className="min-w-[180px] rounded-[22px] border border-white/70 bg-white/80 px-4 py-4 backdrop-blur">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight text-slate-950 ${accentClass ?? ""}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function TrendBar({
  label,
  value,
  max,
  valueText,
  fillClass,
  trackClass,
}: {
  label: string;
  value: number;
  max: number;
  valueText: string;
  fillClass: string;
  trackClass: string;
}) {
  const width = `${Math.max(10, Math.min(100, (value / Math.max(max, 0.0001)) * 100))}%`;

  return (
    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-3">
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className={`h-3 rounded-full ${trackClass}`}>
        <div className={`h-3 rounded-full ${fillClass}`} style={{ width }} />
      </div>
      <div className="text-sm font-semibold text-slate-900">{valueText}</div>
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

function formatMonthLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short" });
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
