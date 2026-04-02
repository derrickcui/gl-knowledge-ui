import { t } from "@/i18n";
import type {
  HeatLevel,
  OptimizationSuggestion,
  TemplateRecommendation,
  ComplexityMetrics,
  HitDistribution,
  PerformanceMetrics,
  RiskAssessment,
} from "./rule-intelligence";
import type { RuleAbTestResult } from "./ab-test";
import type { RuleVersionEntry } from "./RuleVersionTimelinePanel";
import { buildVerificationMarkdown, downloadVerificationMarkdown } from "./verification-export";
import type { TopicAiEvaluateResponse, TopicAiOptimizeResponse } from "@/lib/topic-ai-api";

export function RuleIntelligencePanel({
  topicName,
  complexity,
  distribution,
  suggestions,
  templates,
  performance,
  risk,
  abTestResult,
  versionHistory,
  onApplySuggestion,
  aiEvaluate,
  aiEvaluateBusy = false,
  aiEvaluateError = null,
  aiOptimizeResult,
  aiOptimizeBusy = false,
  aiOptimizeError = null,
  onRefreshAiEvaluate,
  onAiOptimize,
}: {
  topicName: string;
  complexity: ComplexityMetrics;
  distribution: HitDistribution;
  suggestions: OptimizationSuggestion[];
  templates: TemplateRecommendation[];
  performance: PerformanceMetrics;
  risk: RiskAssessment;
  abTestResult: RuleAbTestResult | null;
  versionHistory: RuleVersionEntry[];
  onApplySuggestion: (suggestion: OptimizationSuggestion) => void;
  aiEvaluate?: TopicAiEvaluateResponse | null;
  aiEvaluateBusy?: boolean;
  aiEvaluateError?: string | null;
  aiOptimizeResult?: TopicAiOptimizeResponse | null;
  aiOptimizeBusy?: boolean;
  aiOptimizeError?: string | null;
  onRefreshAiEvaluate?: () => void;
  onAiOptimize?: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{t("ruleEditor.intel.title")}</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={onRefreshAiEvaluate}
            disabled={!onRefreshAiEvaluate || aiEvaluateBusy}
          >
            {aiEvaluateBusy ? "AI评估中..." : "AI评估"}
          </button>
          <button
            type="button"
            className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100 disabled:opacity-50"
            onClick={onAiOptimize}
            disabled={!onAiOptimize || aiOptimizeBusy}
          >
            {aiOptimizeBusy ? "优化中..." : "一键优化"}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="mt-2 rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        onClick={() => {
          const markdown = buildVerificationMarkdown({
            topicName,
            generatedAt: new Date().toLocaleString(),
            complexity,
            performance,
            risk,
            abTestResult,
            versionHistory,
          });
          const safeName = topicName.replace(/[^\w\-]+/g, "_");
          downloadVerificationMarkdown(`verification-${safeName}.md`, markdown);
        }}
      >
        {t("ruleEditor.intel.exportSnapshot")}
      </button>

      {(aiEvaluateError || aiOptimizeError) && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {[aiEvaluateError, aiOptimizeError].filter(Boolean).join(" | ")}
        </div>
      )}

      {aiEvaluate && (
        <div className="mt-3 rounded border border-sky-200 bg-sky-50 p-3 text-xs">
          <div className="font-semibold text-sky-900">AI Rule Health</div>
          {aiEvaluate.summary ? <div className="mt-1 text-sky-900">{aiEvaluate.summary}</div> : null}
          {aiEvaluate.strengths.length > 0 && (
            <div className="mt-2">
              <div className="font-medium text-sky-900">优势</div>
              <div className="mt-1 space-y-1 text-sky-800">
                {aiEvaluate.strengths.map((item) => (
                  <div key={item}>- {item}</div>
                ))}
              </div>
            </div>
          )}
          {aiEvaluate.risks.length > 0 && (
            <div className="mt-2">
              <div className="font-medium text-sky-900">风险</div>
              <div className="mt-1 space-y-1 text-sky-800">
                {aiEvaluate.risks.map((item) => (
                  <div key={item}>- {item}</div>
                ))}
              </div>
            </div>
          )}
          {aiEvaluate.recommendedActions.length > 0 && (
            <div className="mt-2">
              <div className="font-medium text-sky-900">建议</div>
              <div className="mt-1 space-y-1 text-sky-800">
                {aiEvaluate.recommendedActions.map((item) => (
                  <div key={item}>- {item}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {aiOptimizeResult && (
        <div className="mt-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-xs">
          <div className="font-semibold text-emerald-900">AI 优化结果</div>
          {aiOptimizeResult.summary ? <div className="mt-1 text-emerald-900">{aiOptimizeResult.summary}</div> : null}
          {aiOptimizeResult.cautions.length > 0 && (
            <div className="mt-2 space-y-1 text-emerald-800">
              {aiOptimizeResult.cautions.map((item) => (
                <div key={item}>- {item}</div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.complexity.title")}</div>
        <div className="mt-1 text-slate-700">
          {t("ruleEditor.intel.complexity.score", { score: complexity.score })}
          {" · "}
          {complexityLevelLabel(complexity.level)}
        </div>
        <div className="mt-1 text-slate-500">
          n={complexity.nodeCount}, depth={complexity.depth}, prox={complexity.proximityCount}, logsum={complexity.logsumCount}
        </div>
      </div>

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.performance.title")}</div>
        <div className="mt-1 text-slate-700">
          {t("ruleEditor.intel.performance.took", { ms: performance.tookMs ?? "-" })}
        </div>
        <div className="text-slate-700">
          {t("ruleEditor.intel.performance.clause", { count: performance.clauseCount })}
          {" · "}
          {t("ruleEditor.intel.performance.depth", { depth: performance.nestedDepth })}
        </div>
        <div className="text-slate-600">
          {t("ruleEditor.intel.performance.risk", {
            level: performanceRiskLabel(performance.riskLevel),
            score: performance.riskScore,
          })}
        </div>
      </div>

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.risk.title")}</div>
        <div className="mt-1 text-slate-700">
          {t("ruleEditor.intel.risk.level", { level: riskLevelLabel(risk.level), score: risk.score })}
        </div>
        {risk.reasons.length > 0 ? (
          <ul className="mt-1 list-disc pl-4 text-slate-600">
            {risk.reasons.slice(0, 3).map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-slate-400">{t("ruleEditor.intel.empty")}</div>
        )}
      </div>

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.distribution.title")}</div>
        <div className="mt-2">
          <div className="text-slate-600">{t("ruleEditor.intel.distribution.byField")}</div>
          {distribution.byField.length === 0 ? (
            <div className="text-slate-400">{t("ruleEditor.intel.empty")}</div>
          ) : (
            distribution.byField.map((item) => (
              <div key={item.key} className="flex justify-between text-slate-700">
                <span>{item.key}</span>
                <span>{item.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.optimize.title")}</div>
        {suggestions.length === 0 ? (
          <div className="mt-1 text-slate-400">{t("ruleEditor.intel.empty")}</div>
        ) : (
          <div className="mt-2 space-y-2">
            {suggestions.map((item, index) => (
              <div key={`${item.type}-${item.nodeId}-${index}`} className="rounded border border-amber-200 bg-amber-50 p-2">
                <div className="text-amber-800">{item.message}</div>
                <button
                  type="button"
                  className="mt-1 rounded border border-amber-300 bg-white px-2 py-0.5 text-[11px] text-amber-800 hover:bg-amber-100"
                  onClick={() => onApplySuggestion(item)}
                  disabled={item.type === "BACKEND"}
                >
                  {t("ruleEditor.intel.optimize.apply")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 rounded border bg-slate-50 p-2 text-xs">
        <div className="font-semibold text-slate-700">{t("ruleEditor.intel.template.title")}</div>
        {templates.length === 0 ? (
          <div className="mt-1 text-slate-400">{t("ruleEditor.intel.empty")}</div>
        ) : (
          <div className="mt-2 space-y-1">
            {templates.map((item) => (
              <div key={item.key} className="rounded border border-slate-200 bg-white px-2 py-1">
                <div className="font-medium text-slate-700">{item.name}</div>
                <div className="text-slate-500">{item.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function complexityLevelLabel(level: ComplexityMetrics["level"]) {
  if (level === "RISKY") return t("ruleEditor.intel.complexity.level.risky");
  if (level === "COMPLEX") return t("ruleEditor.intel.complexity.level.complex");
  if (level === "MEDIUM") return t("ruleEditor.intel.complexity.level.medium");
  return t("ruleEditor.intel.complexity.level.simple");
}

export function heatLevelDot(level: HeatLevel): string {
  if (level === "HIGH") return "bg-red-500";
  if (level === "MEDIUM") return "bg-orange-500";
  if (level === "LOW") return "bg-yellow-400";
  return "bg-slate-200";
}

function performanceRiskLabel(level: PerformanceMetrics["riskLevel"]) {
  if (level === "HIGH") return t("ruleEditor.intel.risk.level.high");
  if (level === "MEDIUM") return t("ruleEditor.intel.risk.level.medium");
  return t("ruleEditor.intel.risk.level.low");
}

function riskLevelLabel(level: RiskAssessment["level"]) {
  if (level === "CRITICAL") return t("ruleEditor.intel.risk.level.critical");
  if (level === "HIGH") return t("ruleEditor.intel.risk.level.high");
  if (level === "MEDIUM") return t("ruleEditor.intel.risk.level.medium");
  return t("ruleEditor.intel.risk.level.low");
}
