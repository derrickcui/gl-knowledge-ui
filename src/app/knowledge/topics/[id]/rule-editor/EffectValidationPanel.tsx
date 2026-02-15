import { useMemo, useState } from "react";
import { t } from "@/i18n";
import type { RuntimeActiveItem } from "@/lib/api/runtime";
import type {
  RuntimeExecuteFullResponse,
  RuntimeExecuteImpactResponse,
  RuntimeExecuteNodeResponse,
  RuntimeImpactCondition,
} from "@/lib/api/ruleRuntime";
import type { ConditionImpactItem } from "@/lib/rule-preview-api";
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

type EffectValidationPanelProps = {
  busy: boolean;
  error: string | null;
  gqlPreviewEnabled?: boolean;
  activeNodeLabel?: string | null;
  impactRanking?: ConditionImpactItem[];
  fullRuntimeResult?: RuntimeExecuteFullResponse | null;
  impactRuntimeResult?: RuntimeExecuteImpactResponse | null;
  nodeRuntimeResults?: Record<string, RuntimeExecuteNodeResponse>;
  runtimeOptions?: RuntimeActiveItem[];
  activeRuntimeId?: number | null;
  analysisTabs?: AnalysisTab[];
  activeTabId?: string;
  analysisCollapsed?: boolean;
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
  gqlPreviewEnabled = true,
  activeNodeLabel = null,
  impactRanking = [],
  fullRuntimeResult = null,
  impactRuntimeResult = null,
  nodeRuntimeResults = {},
  runtimeOptions = [],
  activeRuntimeId = null,
  analysisTabs = [],
  activeTabId = "FULL",
  analysisCollapsed = false,
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

  const fullTotal = fullRuntimeResult?.total ?? impactRuntimeResult?.fullTotal ?? 0;
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
        <div className="text-sm font-semibold text-slate-800">🔍 分析工作台（可折叠）</div>
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
            {t("ruleEditor.execution.execute")}
          </button>
        </div>
      </div>

      <div className="border-b px-3 py-2">
        <GlobalSummaryBar fullTotal={fullTotal} conditionCount={conditionCount} took={took} executionId={executionId} />
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
            {analysisCollapsed ? "⊕ 展开" : "⊕ 收起"}
          </button>
        </div>

        {!analysisCollapsed && (
          <div className="h-[calc(100%-42px)] min-h-0 p-3">
            {activeTab?.kind === "FULL" ? (
              <FullResultPanel
                result={fullRuntimeResult}
                searchText={searchText}
                onSearchChange={setSearchText}
                onTriggerNodeByReason={(keyword) => {
                  const hit = impactAnalysis.find((item) => item.label.includes(keyword));
                  if (hit) onRunNodeById?.(hit.nodeId);
                }}
                onPrevPage={() => onChangeFullPage?.((fullRuntimeResult?.page ?? 1) - 1)}
                onNextPage={() => onChangeFullPage?.((fullRuntimeResult?.page ?? 1) + 1)}
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

            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
