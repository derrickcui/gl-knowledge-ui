import { useMemo, useState } from "react";
import { t } from "@/i18n";
import type { RuntimeActiveItem } from "@/lib/api/runtime";
import type {
  RuntimeExecuteFullResponse,
  RuntimeExecuteImpactResponse,
  RuntimeExecuteNodeResponse,
  RuntimeImpactCondition,
} from "@/lib/api/ruleRuntime";
import type { ConditionImpactItem, RulePreviewResponse } from "@/lib/rule-preview-api";
import type { HitDistribution, OptimizationSuggestion, TemplateRecommendation } from "./rule-intelligence";
import type { RuleAbTestResult } from "./ab-test";
import type { GeneratedRuleCandidate } from "./rule-auto-generate";
import { GlobalSummaryBar } from "./GlobalSummaryBar";
import { ImpactPanel } from "./ImpactPanel";
import { FullResultPanel } from "./FullResultPanel";
import { NodeDetailPanel } from "./NodeDetailPanel";

type AnalysisTab = {
  id: string;
  title: string;
  kind: "FULL" | "IMPACT" | "NODE";
  nodeId?: string;
  stale?: boolean;
  closable?: boolean;
};

type IntelTab = "DISTRIBUTION" | "OPTIMIZE" | "TEMPLATE" | "ABTEST" | "AUTOGEN";

type EffectValidationPanelProps = {
  busy: boolean;
  error: string | null;
  compiledGql?: string | null;
  compiledGqlSource?: "server" | "local-compiler" | null;
  gqlPreviewEnabled?: boolean;
  activeNodeLabel?: string | null;
  impactRanking?: ConditionImpactItem[];
  previewResult?: RulePreviewResponse | null;
  previewPage?: number;
  previewPageSize?: number;
  fullRuntimeResult?: RuntimeExecuteFullResponse | null;
  impactRuntimeResult?: RuntimeExecuteImpactResponse | null;
  nodeRuntimeResults?: Record<string, RuntimeExecuteNodeResponse>;
  runtimeOptions?: RuntimeActiveItem[];
  activeRuntimeId?: number | null;
  analysisTabs?: AnalysisTab[];
  activeTabId?: string;
  analysisCollapsed?: boolean;
  hitDistribution?: HitDistribution;
  optimizationSuggestions?: OptimizationSuggestion[];
  templateRecommendations?: TemplateRecommendation[];
  generatedCandidates?: GeneratedRuleCandidate[];
  draftBPreview?: {
    candidateId: string;
    added: number;
    removed: number;
    changed: number;
  } | null;
  abTestResult?: RuleAbTestResult | null;
  onRunAbTest?: () => void;
  onApplyOptimizationSuggestion?: (suggestion: OptimizationSuggestion) => void;
  onApplyGeneratedCandidate?: (candidate: GeneratedRuleCandidate) => void;
  onGenerateDraftB?: (candidate: GeneratedRuleCandidate) => void;
  onApplyDraftB?: () => void;
  onChangeRuntime?: (id: number) => void;
  onGenerate?: () => void;
  onChangeFullPage?: (page: number) => void;
  onChangeNodePage?: (page: number) => void;
  onRunNodeById?: (nodeId: string) => void;
  onSelectTab?: (tabId: string) => void;
  onCloseNodeTab?: (tabId: string) => void;
  onAddNodeTab?: () => void;
  onToggleAnalysisCollapsed?: () => void;
};

export function EffectValidationPanel({
  busy,
  error,
  compiledGql = null,
  compiledGqlSource = null,
  gqlPreviewEnabled = true,
  activeNodeLabel = null,
  impactRanking = [],
  previewResult = null,
  previewPage = 1,
  previewPageSize = 20,
  fullRuntimeResult = null,
  impactRuntimeResult = null,
  nodeRuntimeResults = {},
  runtimeOptions = [],
  activeRuntimeId = null,
  analysisTabs = [],
  activeTabId = "FULL",
  analysisCollapsed = false,
  hitDistribution = { byField: [], byKeyword: [] },
  optimizationSuggestions = [],
  templateRecommendations = [],
  generatedCandidates = [],
  draftBPreview = null,
  abTestResult = null,
  onRunAbTest,
  onApplyOptimizationSuggestion,
  onApplyGeneratedCandidate,
  onGenerateDraftB,
  onApplyDraftB,
  onChangeRuntime,
  onGenerate,
  onChangeFullPage,
  onChangeNodePage,
  onRunNodeById,
  onSelectTab,
  onCloseNodeTab,
  onAddNodeTab,
  onToggleAnalysisCollapsed,
}: EffectValidationPanelProps) {
  const [searchText, setSearchText] = useState("");
  const [intelTab, setIntelTab] = useState<IntelTab>("DISTRIBUTION");

  const fullTotal = previewResult?.total ?? fullRuntimeResult?.total ?? impactRuntimeResult?.fullTotal ?? 0;
  const conditionCount = impactRuntimeResult?.conditionCount ?? impactRanking.length;

  const impactAnalysis: RuntimeImpactCondition[] = useMemo(() => {
    if (impactRuntimeResult) return impactRuntimeResult.analysis;
    return impactRanking.map((item) => ({
      nodeId: item.nodeId,
      label: item.label,
      removedTotal: item.totalWithoutNode,
      contribution: item.contribution,
      impactLevel:
        item.contributionRate > 0.5
          ? "HIGH"
          : item.contributionRate >= 0.1
            ? "MEDIUM"
            : item.contributionRate > 0
              ? "LOW"
              : "NONE",
    }));
  }, [impactRuntimeResult, impactRanking]);

  const executionId =
    fullRuntimeResult?.metadata.executionId ??
    impactRuntimeResult?.metadata.executionId ??
    Object.values(nodeRuntimeResults)[0]?.metadata.executionId ??
    "-";
  const took =
    fullRuntimeResult?.took ??
    impactRuntimeResult?.took ??
    Object.values(nodeRuntimeResults)[0]?.took;

  const activeTab = analysisTabs.find((tab) => tab.id === activeTabId) ?? analysisTabs[0];
  const activeNodeResult =
    activeTab?.kind === "NODE" && activeTab.nodeId
      ? nodeRuntimeResults[activeTab.nodeId] ?? null
      : null;
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-white">
      <div className="border-b px-3 py-2">
        <div className="text-sm font-semibold text-slate-800">{t("ruleEditor.execution.title")}</div>
      </div>

      <div className="border-b px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-8 rounded border bg-white px-2 text-xs text-slate-700"
            value={activeRuntimeId ?? ""}
            onChange={(event) => {
              const nextId = Number(event.target.value);
              if (nextId > 0) onChangeRuntime?.(nextId);
            }}
          >
            {runtimeOptions.length === 0 ? (
              <option value="">{t("ruleEditor.execution.runtimeEmpty")}</option>
            ) : null}
            {runtimeOptions.map((runtime) => (
              <option key={runtime.id} value={runtime.id}>
                {runtime.name} - {runtime.datasetName}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40"
            onClick={onGenerate}
            disabled={busy || !onGenerate || !gqlPreviewEnabled}
          >
            {busy ? t("ruleEditor.execution.executing") : t("ruleEditor.execution.execute")}
          </button>
        </div>
      </div>

      <div className="border-b px-3 py-2">
        <GlobalSummaryBar fullTotal={fullTotal} conditionCount={conditionCount} took={took} executionId={executionId} />
        {compiledGql ? (
          <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
            <div className="mb-1 text-[11px] font-semibold text-slate-600">
              GQL ({compiledGqlSource ?? "server"})
            </div>
            <code className="block overflow-x-auto whitespace-pre text-xs text-slate-800">{compiledGql}</code>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 rounded-b-lg bg-white">
        <div className="flex items-center gap-1 border-b bg-slate-50 px-2 py-1.5">
          {analysisTabs.map((tab) => (
            <div key={tab.id} className="flex items-center gap-1">
              <button
                type="button"
                className={`rounded-t border px-2 py-1 text-xs ${
                  tab.id === activeTabId
                    ? "border-slate-300 border-b-white bg-white font-medium text-slate-800"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => onSelectTab?.(tab.id)}
              >
                {tab.title}
                {tab.stale ? <span className="ml-1 text-amber-600">*</span> : null}
              </button>
              {tab.closable ? (
                <button
                  type="button"
                  className="rounded px-1 text-xs text-slate-500 hover:bg-slate-200"
                  onClick={() => onCloseNodeTab?.(tab.id)}
                >
                  x
                </button>
              ) : null}
            </div>
          ))}

          <button
            type="button"
            className="ml-1 rounded border px-2 py-0.5 text-xs hover:bg-slate-100"
            onClick={onAddNodeTab}
            title="Add NODE tab"
          >
            +
          </button>

          <button
            type="button"
            className="ml-auto rounded border px-2 py-0.5 text-xs hover:bg-slate-100"
            onClick={onToggleAnalysisCollapsed}
          >
            {analysisCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {!analysisCollapsed && (
          <div className="flex h-[calc(100%-42px)] min-h-0 flex-col p-3">
            <div className="min-h-0 flex-1 overflow-auto">
              {activeTab?.kind === "FULL" ? (
                <FullResultPanel
                  result={previewResult ?? fullRuntimeResult}
                  page={previewResult ? previewPage : undefined}
                  size={previewResult ? previewPageSize : undefined}
                  modeLabel="FULL"
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  onTriggerNodeByReason={(keyword) => {
                    const hit = impactAnalysis.find((item) => item.label.includes(keyword));
                    if (hit) onRunNodeById?.(hit.nodeId);
                  }}
                  onPrevPage={() =>
                    onChangeFullPage?.(((previewResult ? previewPage : fullRuntimeResult?.page) ?? 1) - 1)
                  }
                  onNextPage={() =>
                    onChangeFullPage?.(((previewResult ? previewPage : fullRuntimeResult?.page) ?? 1) + 1)
                  }
                />
              ) : activeTab?.kind === "IMPACT" ? (
                <ImpactPanel analysis={impactAnalysis} onSelectNode={(nodeId) => onRunNodeById?.(nodeId)} />
              ) : (
                <NodeDetailPanel
                  result={activeNodeResult}
                  activeNodeLabel={activeNodeLabel}
                  onPrevPage={() => onChangeNodePage?.((activeNodeResult?.page ?? 1) - 1)}
                  onNextPage={() => onChangeNodePage?.((activeNodeResult?.page ?? 1) + 1)}
                />
              )}
            </div>

            <div className="mt-3 border-t pt-2">
              <div className="mb-2 flex items-center gap-1">
                <IntelTabButton
                  active={intelTab === "DISTRIBUTION"}
                  label={t("ruleEditor.intel.tab.distribution")}
                  onClick={() => setIntelTab("DISTRIBUTION")}
                />
                <IntelTabButton
                  active={intelTab === "OPTIMIZE"}
                  label={t("ruleEditor.intel.tab.optimize")}
                  onClick={() => setIntelTab("OPTIMIZE")}
                />
                <IntelTabButton
                  active={intelTab === "TEMPLATE"}
                  label={t("ruleEditor.intel.tab.template")}
                  onClick={() => setIntelTab("TEMPLATE")}
                />
                <IntelTabButton
                  active={intelTab === "ABTEST"}
                  label={t("ruleEditor.intel.tab.abtest")}
                  onClick={() => setIntelTab("ABTEST")}
                />
                <IntelTabButton
                  active={intelTab === "AUTOGEN"}
                  label={t("ruleEditor.intel.tab.autogen")}
                  onClick={() => setIntelTab("AUTOGEN")}
                />
              </div>

              {intelTab === "DISTRIBUTION" ? (
                <DistributionBars
                  title={t("ruleEditor.intel.distribution.byField")}
                  items={hitDistribution.byField}
                />
              ) : intelTab === "OPTIMIZE" ? (
                <OptimizationList
                  items={optimizationSuggestions}
                  onApply={onApplyOptimizationSuggestion}
                />
              ) : intelTab === "TEMPLATE" ? (
                <TemplateList items={templateRecommendations} />
              ) : intelTab === "ABTEST" ? (
                <AbTestPanel result={abTestResult} onRun={onRunAbTest} busy={busy} />
              ) : (
                <AutoGeneratedCandidatesPanel
                  items={generatedCandidates}
                  onApply={onApplyGeneratedCandidate}
                  onGenerateDraftB={onGenerateDraftB}
                  draftBPreview={draftBPreview}
                  onApplyDraftB={onApplyDraftB}
                />
              )}
            </div>

            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function AutoGeneratedCandidatesPanel({
  items,
  onApply,
  onGenerateDraftB,
  draftBPreview,
  onApplyDraftB,
}: {
  items: GeneratedRuleCandidate[];
  onApply?: (candidate: GeneratedRuleCandidate) => void;
  onGenerateDraftB?: (candidate: GeneratedRuleCandidate) => void;
  draftBPreview?: {
    candidateId: string;
    added: number;
    removed: number;
    changed: number;
  } | null;
  onApplyDraftB?: () => void;
}) {
  if (items.length === 0) {
    return <div className="text-xs text-slate-400">{t("ruleEditor.intel.empty")}</div>;
  }
  return (
    <div className="space-y-2 text-xs">
      {items.map((item) => (
        <div key={item.id} className="rounded border border-sky-200 bg-sky-50 p-2">
          <div className="font-medium text-sky-800">{item.title}</div>
          <div className="mt-1 rounded border border-sky-100 bg-white px-2 py-1 font-mono text-[11px] text-slate-700">
            {item.rulePreview}
          </div>
          <div className="mt-1 text-slate-600">{item.reason}</div>
          <div className="text-slate-600">
            {t("ruleEditor.intel.autogen.coverage", { value: (item.estimatedCoverage * 100).toFixed(1) })} ·{" "}
            {t("ruleEditor.intel.autogen.precision", { value: (item.estimatedPrecision * 100).toFixed(1) })}
          </div>
          <button
            type="button"
            className="mt-1 rounded border border-sky-300 bg-white px-2 py-0.5 text-[11px] text-sky-800 hover:bg-sky-100"
            onClick={() => onApply?.(item)}
          >
            {t("ruleEditor.intel.autogen.apply")}
          </button>
          <button
            type="button"
            className="ml-2 mt-1 rounded border border-indigo-300 bg-white px-2 py-0.5 text-[11px] text-indigo-800 hover:bg-indigo-100"
            onClick={() => onGenerateDraftB?.(item)}
          >
            {t("ruleEditor.intel.autogen.generateDraftB")}
          </button>
          {draftBPreview && draftBPreview.candidateId === item.id ? (
            <div className="mt-2 rounded border border-indigo-200 bg-indigo-50 p-2 text-[11px] text-indigo-800">
              <div>
                +{draftBPreview.added} / -{draftBPreview.removed} / ~{draftBPreview.changed}
              </div>
              <button
                type="button"
                className="mt-1 rounded border border-indigo-300 bg-white px-2 py-0.5 text-[11px] hover:bg-indigo-100"
                onClick={onApplyDraftB}
              >
                {t("ruleEditor.intel.autogen.applyDraftB")}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function IntelTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded border px-2 py-1 text-xs ${
        active ? "border-slate-300 bg-white text-slate-800" : "border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function DistributionBars({
  title,
  items,
}: {
  title: string;
  items: Array<{ key: string; count: number }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="space-y-2 text-xs">
      <div className="font-semibold text-slate-700">{title}</div>
      {items.length === 0 ? (
        <div className="text-slate-400">{t("ruleEditor.intel.empty")}</div>
      ) : (
        items.map((item) => {
          const ratio = Math.round((item.count / max) * 100);
          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span className="truncate pr-2">{item.key}</span>
                <span>{item.count}</span>
              </div>
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-blue-500" style={{ width: `${ratio}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function OptimizationList({
  items,
  onApply,
}: {
  items: OptimizationSuggestion[];
  onApply?: (suggestion: OptimizationSuggestion) => void;
}) {
  if (items.length === 0) {
    return <div className="text-xs text-slate-400">{t("ruleEditor.intel.empty")}</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={`${item.type}-${item.nodeId}-${index}`} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs">
          <div className="text-amber-800">{item.message}</div>
          <button
            type="button"
            className="mt-1 rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-800 hover:bg-amber-100"
            onClick={() => onApply?.(item)}
            disabled={item.type === "BACKEND"}
          >
            {t("ruleEditor.intel.optimize.apply")}
          </button>
        </div>
      ))}
    </div>
  );
}

function TemplateList({ items }: { items: TemplateRecommendation[] }) {
  if (items.length === 0) {
    return <div className="text-xs text-slate-400">{t("ruleEditor.intel.empty")}</div>;
  }
  return (
    <div className="space-y-1 text-xs">
      {items.map((item) => (
        <div key={item.key} className="rounded border border-slate-200 bg-white px-2 py-1">
          <div className="font-medium text-slate-700">{item.name}</div>
          <div className="text-slate-500">{item.reason}</div>
        </div>
      ))}
    </div>
  );
}

function AbTestPanel({
  result,
  onRun,
  busy,
}: {
  result: RuleAbTestResult | null;
  onRun?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="space-y-2 text-xs">
      <button
        type="button"
        className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
        onClick={onRun}
        disabled={!onRun || busy}
      >
        {busy ? t("ruleEditor.intel.abtest.running") : t("ruleEditor.intel.abtest.run")}
      </button>
      {!result ? (
        <div className="text-slate-400">{t("ruleEditor.intel.empty")}</div>
      ) : (
        <div className="rounded border border-slate-200 bg-white p-2">
          <div className="text-slate-600">{result.generatedAt}</div>
          <table className="mt-1 w-full text-left text-[11px]">
            <thead>
              <tr className="text-slate-500">
                <th>{t("ruleEditor.intel.abtest.metric")}</th>
                <th>A</th>
                <th>B</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr>
                <td>{t("ruleEditor.intel.abtest.hit")}</td>
                <td>{result.ruleA.total}</td>
                <td>{result.ruleB.total}</td>
              </tr>
              <tr>
                <td>{t("ruleEditor.intel.abtest.took")}</td>
                <td>{result.ruleA.took}ms</td>
                <td>{result.ruleB.took}ms</td>
              </tr>
              <tr>
                <td>{t("ruleEditor.intel.abtest.delta")}</td>
                <td colSpan={2}>
                  {result.deltaHit} ({(result.deltaHitRate * 100).toFixed(1)}%)
                </td>
              </tr>
              <tr>
                <td>{t("ruleEditor.intel.abtest.overlap")}</td>
                <td colSpan={2}>{(result.overlapRate * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>{t("ruleEditor.intel.abtest.winner")}</td>
                <td colSpan={2}>{result.winner}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
