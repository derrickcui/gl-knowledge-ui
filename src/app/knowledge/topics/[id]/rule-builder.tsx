"use client";

import { useEffect } from "react";

import { Trash2, CopyPlus, Minus, Plus } from "lucide-react";

import ConditionCard from "@/components/rule-builder/ConditionCard";
import { RuleNode } from "@/components/rule-builder/astTypes";
import { ActivePath, isSamePath } from "@/components/rule-builder/pathUtils";
import {
  removeScenario,
  normalizeForRuleBuilder,
} from "@/components/rule-builder/ruleGroupOps";
import { GroupExplainEditor } from "@/components/rule-builder/GroupExplainEditor";
import { GroupPriorityEditor } from "@/components/rule-builder/GroupPriorityEditor";
import type { RuleTemplateCapability } from "@/components/rule-builder/templateCapabilities";
import { t } from "@/i18n";

type ProximityRelation = "NONE" | "NEAR" | "ORDER";
type ProximityRange = "DOCUMENT" | "PARAGRAPH" | "SENTENCE";
type ProximityDistancePreset = "TIGHT" | "NEAR" | "CUSTOM";

type ScenarioProximityConfig = {
  relation: ProximityRelation;
  range: ProximityRange;
  distance?: number;
  distancePreset?: ProximityDistancePreset;
};

const DEFAULT_PROXIMITY: ScenarioProximityConfig = {
  relation: "NONE",
  range: "DOCUMENT",
  distancePreset: "TIGHT",
  distance: 3,
};

const clampDistance = (value: number) =>
  Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;

function normalizeProximityConfig(
  raw?: ScenarioProximityConfig | null
): ScenarioProximityConfig {
  if (!raw) return { ...DEFAULT_PROXIMITY };
  const relation = raw.relation ?? "NONE";
  const range = raw.range ?? "DOCUMENT";
  const distance = raw.distance ?? DEFAULT_PROXIMITY.distance;
  const distancePreset = raw.distancePreset ?? (() => {
    if (distance === 3) return "TIGHT";
    if (distance === 8) return "NEAR";
    return "CUSTOM";
  })();
  return {
    relation,
    range,
    distance,
    distancePreset,
  };
}

function collectBaseTypes(node: RuleNode, acc: Set<RuleNode["type"]>) {
  if (!node) return;
  if (node.type === "PROXIMITY" || node.type === "FIELD_CONDITION") {
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => collectBaseTypes(child, acc));
      return;
    }
  }
  if (node.type === "LOGIC") {
    node.children?.forEach((child) => collectBaseTypes(child, acc));
    return;
  }
  if (node.type === "GROUP") {
    node.children?.forEach((child) => collectBaseTypes(child, acc));
    return;
  }
  acc.add(node.type);
}

function isScenarioProximityEligible(scenario: RuleNode): boolean {
  const conditionCount = scenario.children?.length ?? 0;
  if (conditionCount < 2) return false;
  const baseTypes = new Set<RuleNode["type"]>();
  scenario.children?.forEach((child) => collectBaseTypes(child, baseTypes));
  if (baseTypes.has("TOPIC_REF")) return false;
  const allowed = new Set<RuleNode["type"]>([
    "CONCEPT_MATCH",
    "TEXT_MATCH",
    "FIELD_CONDITION",
  ]);
  for (const type of baseTypes) {
    if (!allowed.has(type)) return false;
  }
  return baseTypes.size > 0;
}

interface Props {
  rule: RuleNode;
  activePath: ActivePath;
  hoverPath?: ActivePath | null;
  highlightedConditionId?: string;
  onSelect: (path: ActivePath) => void;
  onChange: (nextRule: RuleNode) => void;
  onAddScenario: () => void;
  onEditCondition?: (scenarioIndex: number, conditionIndex: number) => void;
  readOnly?: boolean;
  templateCapabilities?: RuleTemplateCapability | null;
}

export function RuleBuilder({
  rule,
  activePath,
  hoverPath,
  highlightedConditionId,
  onSelect,
  onChange,
  onAddScenario,
  onEditCondition,
  readOnly = false,
  templateCapabilities,
}: Props) {
  const root = normalizeForRuleBuilder(rule);
  const scenarios = root.children ?? [];
  const showRuleEmpty = scenarios.length === 0;
  const ruleOperator = root.params?.operator ?? "ANY";
  const ruleSummary =
    ruleOperator === "ALL"
      ? t("ruleBuilder.summary.all")
      : t("ruleBuilder.summary.any");

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">
            {t("ruleBuilder.title")}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {ruleSummary}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">
              {t("ruleBuilder.logicLabel")}
            </span>
            <button
              type="button"
              disabled={readOnly}
              className={`rounded border px-2 py-0.5 ${
                ruleOperator === "ALL"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => {
                if (readOnly || ruleOperator === "ALL") return;
                onChange({
                  ...root,
                  params: {
                    ...root.params,
                    operator: "ALL",
                  },
                });
              }}
            >
              {t("ruleBuilder.all")}
            </button>
            <button
              type="button"
              disabled={readOnly}
              className={`rounded border px-2 py-0.5 ${
                ruleOperator === "ANY"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
              onClick={() => {
                if (readOnly || ruleOperator === "ANY") return;
                onChange({
                  ...root,
                  params: {
                    ...root.params,
                    operator: "ANY",
                  },
                });
              }}
            >
              {t("ruleBuilder.any")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {readOnly && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              {t("ruleBuilder.readOnly")}
            </span>
          )}

          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (readOnly) return;
              onAddScenario();
            }}
            className="inline-flex items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            title={t("ruleBuilder.addScenarioTitle")}
          >
            <CopyPlus className="h-3.5 w-3.5" />
            {t("ruleBuilder.addScenario")}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {showRuleEmpty && !readOnly && (
          <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
            <div>{t("ruleBuilder.empty.title")}</div>
            <div className="mt-2">
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={onAddScenario}
              >
                {t("ruleBuilder.empty.addScenario")}
              </button>
            </div>
          </div>
        )}
        {scenarios.length === 0 ? (
          <EmptyState />
        ) : (
          scenarios.map((scenario, idx) => (
            <ScenarioCard
              key={`scenario-${idx}`}
              index={idx}
              scenario={scenario}
              root={root}
              activePath={activePath}
              hoverPath={hoverPath}
              highlightedConditionId={highlightedConditionId}
              readOnly={readOnly}
              templateCapabilities={templateCapabilities}
              onSelect={onSelect}
              onUpdate={(nextScenario) => {
                const nextRule = {
                  ...root,
                  children: (root.children ?? []).map((child, cidx) =>
                    cidx === idx ? nextScenario : child
                  ),
                };
                onChange(nextRule);
              }}
              onDelete={() => {
                if (readOnly) return;
                const next = removeScenario(root, idx);
                onChange(next);
                const nextIndex = Math.min(
                  idx,
                  Math.max(0, (next.children?.length ?? 1) - 1)
                );
                onSelect([nextIndex]);
              }}
              onEditCondition={onEditCondition}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ScenarioCard({
  index,
  scenario,
  root,
  activePath,
  hoverPath,
  highlightedConditionId,
  readOnly,
  templateCapabilities,
  onSelect,
  onDelete,
  onUpdate,
  onEditCondition,
}: {
  index: number;
  scenario: RuleNode;
  root: RuleNode;
  activePath: ActivePath;
  hoverPath?: ActivePath | null;
  highlightedConditionId?: string;
  readOnly: boolean;
  templateCapabilities?: RuleTemplateCapability | null;
  onSelect: (path: ActivePath) => void;
  onDelete: () => void;
  onUpdate: (nextScenario: RuleNode) => void;
  onEditCondition?: (scenarioIndex: number, conditionIndex: number) => void;
}) {
  const hasTopicRef = (node: RuleNode | undefined): boolean => {
    if (!node) return false;
    if (node.type === "TOPIC_REF") return true;
    return (node.children ?? []).some((child) => hasTopicRef(child));
  };

  const handleToggleNegation = (childIdx: number, next: boolean) => {
    if (readOnly) return;
    const child = scenario.children?.[childIdx];
    if (!child) return;
    const nextChild: RuleNode = {
      ...child,
      params: {
        ...child.params,
        negated: next,
      },
    };
    const nextScenario = {
      ...scenario,
      children: (scenario.children ?? []).map((node, idx) =>
        idx === childIdx ? nextChild : node
      ),
    };
    onUpdate(nextScenario);
  };

  const handleImportanceChange = (
    childIdx: number,
    next: "HIGH" | "NORMAL" | "LOW"
  ) => {
    if (readOnly) return;
    const child = scenario.children?.[childIdx];
    if (!child) return;
    const nextChild: RuleNode = {
      ...child,
      params: {
        ...child.params,
        importance: next,
      },
    };
    const nextScenario = {
      ...scenario,
      children: (scenario.children ?? []).map((node, idx) =>
        idx === childIdx ? nextChild : node
      ),
    };
    onUpdate(nextScenario);
  };

  const scenarioPath: ActivePath = [index];
  const selectedScenario = activePath.length > 0 && activePath[0] === index;
  const hasTemplate = !!templateCapabilities;
  const allowAll = hasTemplate
    ? templateCapabilities?.allowAll === true
    : true;
  const allowAny = hasTemplate
    ? templateCapabilities?.allowAny === true
    : true;
  const allowAccrue = hasTemplate
    ? templateCapabilities?.allowAccrue === true
    : true;
  const allowLogsum = hasTemplate
    ? templateCapabilities?.allowLogsum === true
    : true;
  const allowThreshold = hasTemplate
    ? templateCapabilities?.allowThreshold === true
    : true;
  const allowImportance = hasTemplate
    ? templateCapabilities?.allowImportance === true
    : true;
  const allowNegate = templateCapabilities?.allowNegate !== false;
  const allowNear = hasTemplate
    ? templateCapabilities?.allowNear === true
    : true;
  const allowOrder = hasTemplate
    ? templateCapabilities?.allowOrder === true
    : true;
  // When template only allows ALL: scenario header degrades to read-only,
  // operator fixed to AND, and scoring/threshold/importance/accrue UI hidden.
  const onlyAllowAll =
    allowAll &&
    !allowAny &&
    !allowAccrue &&
    !allowLogsum &&
    !allowThreshold &&
    !allowImportance;
  const baseTitle =
    scenario.params?.title || t("scenario.title", { index: index + 1 });
  const rawScenarioOperator = scenario.params?.operator ?? "AND";
  const importanceMode = scenario.params?.importanceMode === "IMPORTANCE";
  const legacyLogsum =
    rawScenarioOperator === "ACCRUE" && scenario.params?.mode === "LOGSUM";
  const scenarioOperator =
    rawScenarioOperator === "ALL"
      ? "AND"
      : rawScenarioOperator === "ANY"
      ? "OR"
      : rawScenarioOperator === "LOGSUM" && importanceMode
      ? "WEIGHTED"
      : rawScenarioOperator === "LOGSUM"
      ? "LOGSUM"
      : legacyLogsum
      ? "LOGSUM"
      : rawScenarioOperator === "ACCRUE"
      ? "ACCRUE"
      : rawScenarioOperator;
  const conditionCount = scenario.children?.length ?? 0;
  const isTopicScene = hasTopicRef(scenario);
  const canUseLogsum = conditionCount >= 3;
  const canUseImportance =
    conditionCount >= 2 && !isTopicScene && allowImportance;
  const proximityEligible =
    !isTopicScene && isScenarioProximityEligible(scenario);
  const thresholdRaw = scenario.params?.threshold ?? 2;
  const threshold = Math.max(2, Math.min(thresholdRaw, conditionCount));
  const allowedOperators = ([
    allowAll ? "AND" : null,
    allowAny ? "OR" : null,
    allowLogsum ? "LOGSUM" : null,
    allowLogsum && allowImportance ? "WEIGHTED" : null,
    allowAccrue ? "ACCRUE" : null,
  ] as const)
    .filter(
      (
        value
      ): value is "AND" | "OR" | "LOGSUM" | "WEIGHTED" | "ACCRUE" =>
        Boolean(value)
    );
  const fallbackOperator = allowedOperators[0] ?? "AND";
  const effectiveOperator = allowedOperators.includes(scenarioOperator)
    ? scenarioOperator
    : fallbackOperator;
  const scenarioOperatorLabel = onlyAllowAll
    ? t("scenario.operator.allLabel")
    : effectiveOperator === "OR"
    ? t("scenario.operator.anyLabel")
    : effectiveOperator === "ACCRUE"
    ? t("scenario.operator.accrueSoftLabel")
    : effectiveOperator === "WEIGHTED"
    ? t("scenario.operator.importanceLabel")
    : effectiveOperator === "LOGSUM"
    ? t("scenario.operator.accrueLabel")
    : t("scenario.operator.allLabel");
  const scenarioTitle = onlyAllowAll
    ? baseTitle
    : effectiveOperator === "LOGSUM"
    ? t("scenario.title.accrue", {
        title: baseTitle,
        threshold,
      })
    : effectiveOperator === "ACCRUE"
    ? t("scenario.title.accrueSoft", { title: baseTitle })
    : baseTitle;
  const scenarioSummary = onlyAllowAll
    ? t("scenario.summary.all")
    : effectiveOperator === "OR"
    ? t("scenario.summary.any")
    : effectiveOperator === "WEIGHTED"
    ? t("scenario.summary.importance")
    : effectiveOperator === "LOGSUM"
    ? t("scenario.summary.accrue", {
        threshold,
        count: conditionCount,
      })
    : effectiveOperator === "ACCRUE"
    ? t("scenario.summary.accrueSoft")
    : t("scenario.summary.all");

  const handleScenarioOperatorChange = (
    nextOperator: "AND" | "OR" | "LOGSUM" | "WEIGHTED" | "ACCRUE"
  ) => {
    if (readOnly) return;
    if (!allowedOperators.includes(nextOperator)) return;
    if (nextOperator === "LOGSUM" && !canUseLogsum) return;
    if (nextOperator === "WEIGHTED" && !canUseImportance) return;
    const isWeighted = nextOperator === "WEIGHTED";
    const nextThreshold =
      nextOperator === "LOGSUM" || isWeighted
        ? scenario.params?.threshold ?? 2
        : undefined;
    const nextScenario = {
      ...scenario,
      params: {
        ...scenario.params,
        operator: isWeighted ? "LOGSUM" : nextOperator,
        mode: nextOperator === "ACCRUE" ? "ACCRUE" : undefined,
        threshold: nextThreshold,
        importanceMode: isWeighted ? "IMPORTANCE" : undefined,
      },
    };
    onUpdate(nextScenario);
  };

  const handleThresholdChange = (next: number) => {
    if (readOnly) return;
    const clamped = Math.max(2, Math.min(next, conditionCount));
    onUpdate({
      ...scenario,
      params: {
        ...scenario.params,
        operator: "LOGSUM",
        mode: undefined,
        threshold: clamped,
        importanceMode: undefined,
      },
    });
  };

  const isEmpty = !scenario.children || scenario.children.length === 0;

  useEffect(() => {
    if (!onlyAllowAll) return;
    if (scenario.params?.operator === "AND") return;
    onUpdate({
      ...scenario,
      params: {
        ...scenario.params,
        operator: "AND",
        mode: undefined,
        threshold: undefined,
        importanceMode: undefined,
      },
    });
  }, [onlyAllowAll, scenario, onUpdate]);

  useEffect(() => {
    if (readOnly) return;
    if (!allowedOperators.includes(scenarioOperator)) {
      handleScenarioOperatorChange(fallbackOperator);
      return;
    }
    if (scenarioOperator === "LOGSUM" && !canUseLogsum) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          operator: "AND",
          mode: undefined,
          threshold: undefined,
          importanceMode: undefined,
        },
      });
      return;
    }
    if (scenarioOperator === "WEIGHTED" && !canUseImportance) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          operator: "AND",
          mode: undefined,
          threshold: undefined,
          importanceMode: undefined,
        },
      });
      return;
    }
    if (scenarioOperator === "LOGSUM" && thresholdRaw !== threshold) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          operator: "LOGSUM",
          mode: undefined,
          threshold,
          importanceMode: undefined,
        },
      });
    }
    if (
      scenarioOperator === "WEIGHTED" &&
      scenario.params?.threshold !== 2
    ) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          operator: "LOGSUM",
          mode: undefined,
          threshold: 2,
          importanceMode: "IMPORTANCE",
        },
      });
    }
  }, [
    canUseLogsum,
    canUseImportance,
    allowLogsum,
    allowImportance,
    allowAll,
    allowAny,
    allowAccrue,
    readOnly,
    scenario,
    scenarioOperator,
    threshold,
    thresholdRaw,
    onUpdate,
    allowedOperators,
    fallbackOperator,
    handleScenarioOperatorChange,
  ]);

  useEffect(() => {
    if (readOnly) return;
    if (!scenario.params?.proximity) return;
    if (!proximityEligible) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          proximity: undefined,
        },
      });
      return;
    }
    if (!allowNear && !allowOrder) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          proximity: undefined,
        },
      });
      return;
    }
    const relation =
      (scenario.params?.proximity as ScenarioProximityConfig | undefined)
        ?.relation ?? "NONE";
    if (relation === "NEAR" && !allowNear) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          proximity: undefined,
        },
      });
      return;
    }
    if (relation === "ORDER" && !allowOrder) {
      onUpdate({
        ...scenario,
        params: {
          ...scenario.params,
          proximity: undefined,
        },
      });
    }
  }, [proximityEligible, readOnly, scenario, onUpdate, allowNear, allowOrder]);

  useEffect(() => {
    if (readOnly) return;
    if (allowNegate) return;
    const children = scenario.children ?? [];
    const hasNegated = children.some((child) => child?.params?.negated);
    if (!hasNegated) return;
    onUpdate({
      ...scenario,
      children: children.map((child) =>
        child
          ? {
              ...child,
              params: {
                ...child.params,
                negated: false,
              },
            }
          : child
      ),
    });
  }, [readOnly, allowNegate, scenario, onUpdate]);

  const proximityConfig = normalizeProximityConfig(
    scenario.params?.proximity as ScenarioProximityConfig | undefined
  );
  const proximityRelation = proximityConfig.relation ?? "NONE";

  const handleProximityChange = (next?: ScenarioProximityConfig) => {
    if (readOnly) return;
    onUpdate({
      ...scenario,
      params: {
        ...scenario.params,
        proximity: next && next.relation !== "NONE" ? next : undefined,
      },
    });
  };

  const handleProximityRelationChange = (relation: ProximityRelation) => {
    if (readOnly) return;
    if (relation === "NONE") {
      handleProximityChange(undefined);
      return;
    }
    const hasExisting = !!scenario.params?.proximity;
    const base = normalizeProximityConfig(
      scenario.params?.proximity as ScenarioProximityConfig | undefined
    );
    const next: ScenarioProximityConfig = {
      ...base,
      relation,
      range: hasExisting ? base.range ?? "SENTENCE" : "SENTENCE",
    };
    if (relation === "NEAR") {
      const distance = clampDistance(
        base.distance ?? DEFAULT_PROXIMITY.distance ?? 3
      );
      next.distance = distance;
      next.distancePreset =
        base.distancePreset ??
        (distance === 3 ? "TIGHT" : distance === 8 ? "NEAR" : "CUSTOM");
    } else {
      delete next.distance;
      delete next.distancePreset;
    }
    handleProximityChange(next);
  };

  const handleProximityRangeChange = (range: ProximityRange) => {
    if (readOnly) return;
    handleProximityChange({
      ...proximityConfig,
      relation: proximityRelation === "NONE" ? "NEAR" : proximityRelation,
      range,
    });
  };

  const handleDistancePresetChange = (preset: ProximityDistancePreset) => {
    if (readOnly) return;
    let distance = proximityConfig.distance ?? DEFAULT_PROXIMITY.distance ?? 3;
    if (preset === "TIGHT") distance = 3;
    if (preset === "NEAR") distance = 8;
    handleProximityChange({
      ...proximityConfig,
      relation: "NEAR",
      distancePreset: preset,
      distance: clampDistance(distance),
    });
  };

  const handleCustomDistanceChange = (value: number) => {
    if (readOnly) return;
    handleProximityChange({
      ...proximityConfig,
      relation: "NEAR",
      distancePreset: "CUSTOM",
      distance: clampDistance(value),
    });
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        selectedScenario ? "border-blue-500 bg-blue-50/40" : "bg-white"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(scenarioPath);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">
              {scenarioTitle}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {scenarioOperatorLabel}
              </span>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {scenarioSummary}
          </div>
          {onlyAllowAll ? (
            <div className="mt-2 text-xs text-slate-500">
              <div className="text-[12px] font-medium text-slate-700">
                {"\u5224\u65ad\u65b9\u5f0f\uff1a\u5fc5\u987b\u6ee1\u8db3\u6240\u6709\u6761\u4ef6"}
              </div>
              <div className="text-[11px] text-slate-400">
                {"\u8be5\u4e3b\u9898\u6a21\u677f\u9650\u5b9a\u4e3a\u300c\u6240\u6709\u6761\u4ef6\u540c\u65f6\u6210\u7acb\u300d\u3002"}
              </div>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="text-[11px] font-medium text-slate-600">
                {t("scenario.conditionsLabel")}
              </span>
              {allowedOperators.map((value) => {
                const disabledOption =
                  readOnly ||
                  (value === "LOGSUM" && !canUseLogsum) ||
                  (value === "WEIGHTED" && !canUseImportance);
                return (
                  <label
                    key={value}
                    className={`inline-flex items-center gap-1 text-[12px] font-medium ${
                      disabledOption ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`scenario-${index}-operator`}
                      value={value}
                      checked={effectiveOperator === value}
                      disabled={disabledOption}
                      onChange={() => handleScenarioOperatorChange(value)}
                      className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                    />
                    {value === "AND"
                      ? t("scenario.and")
                      : value === "OR"
                      ? t("scenario.or")
                      : value === "WEIGHTED"
                      ? t("scenario.importance")
                      : value === "LOGSUM"
                      ? t("scenario.operator.accrueLabel")
                      : t("scenario.accrueSoft")}
                  </label>
                );
              })}
            </div>
          )}
          <GroupPriorityEditor
            group={scenario}
            readOnly={readOnly}
            onChange={(nextScenario) => onUpdate(nextScenario)}
          />
        </div>

        <button
          type="button"
          disabled={readOnly || (root.children?.length ?? 0) <= 1}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="inline-flex items-center gap-1 rounded-md border bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            (root.children?.length ?? 0) <= 1
              ? t("scenario.deleteMinTitle")
              : t("scenario.deleteTitle")
          }
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("scenario.delete")}
        </button>
      </div>

      <div className="mt-3">
        {effectiveOperator === "LOGSUM" &&
          allowThreshold &&
          !onlyAllowAll && (
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="text-[12px] font-semibold text-slate-700">
              {t("scenario.accrue.panelTitle")}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[12px] text-slate-600">
                {t("scenario.accrue.panelLabel")}
              </span>
              <button
                type="button"
                disabled={readOnly || threshold <= 2}
                onClick={() => handleThresholdChange(threshold - 1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded border bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Decrease threshold"
              >
                <Minus className="h-3 w-3" />
              </button>
              <div className="min-w-[32px] rounded border bg-white px-2 py-0.5 text-center text-sm text-slate-900">
                {threshold}
              </div>
              <button
                type="button"
                disabled={readOnly || threshold >= conditionCount}
                onClick={() => handleThresholdChange(threshold + 1)}
                className="inline-flex h-6 w-6 items-center justify-center rounded border bg-white text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Increase threshold"
              >
                <Plus className="h-3 w-3" />
              </button>
              <span className="text-[12px] text-slate-600">
                {t("scenario.accrue.panelSuffix", { count: conditionCount })}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              <div>{t("scenario.accrue.panelDesc.line1")}</div>
              <div>
                {t("scenario.accrue.panelDesc.line2", {
                  count: conditionCount,
                  threshold,
                })}
              </div>
            </div>
          </div>
        )}
        {effectiveOperator === "ACCRUE" && !onlyAllowAll && (
          <div className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="text-[12px] font-semibold text-slate-700">
              {t("scenario.accrueSoft.panelTitle")}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              <div>{t("scenario.accrueSoft.panelDesc.line1")}</div>
              <div>{t("scenario.accrueSoft.panelDesc.line2")}</div>
              <div>{t("scenario.accrueSoft.panelDesc.line3")}</div>
            </div>
          </div>
        )}
        {isEmpty ? (
          <div
            className={`rounded-md border border-dashed p-3 text-sm text-slate-600 ${
              selectedScenario ? "bg-white" : "bg-slate-50"
            }`}
          >
            <div>{t("scenario.empty")}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("scenario.emptyHint")}
              {t("scenario.emptyExample")}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {scenario.children!.map((child, childIdx) => {
              if (!child) return null;
              const childPath: ActivePath = [index, childIdx];
              const childSelected = isSamePath(childPath, activePath);
              const childHighlighted =
                !!hoverPath && isSamePath(childPath, hoverPath);
              const explainHighlighted =
                !!highlightedConditionId &&
                child?.id === highlightedConditionId;

              return (
                <div
                  key={`scenario-${index}-child-${childIdx}`}
                  className={`rounded border ${
                    childSelected
                      ? "border-blue-500 bg-blue-50"
                      : childHighlighted || explainHighlighted
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="relative">
                    <ConditionCard
                      node={child}
                      path={childPath}
                      activePath={activePath}
                      highlighted={childHighlighted || explainHighlighted}
                      selected={childSelected}
                      onSelect={readOnly ? () => {} : onSelect}
                      onToggleNegation={(next) =>
                        handleToggleNegation(childIdx, next)
                      }
                      showImportance={
                        effectiveOperator === "WEIGHTED" &&
                        canUseImportance &&
                        allowImportance
                      }
                      allowNegate={allowNegate}
                      importance={child.params?.importance ?? "NORMAL"}
                      onChangeImportance={(next) =>
                        handleImportanceChange(childIdx, next)
                      }
                      readOnly={readOnly}
                    />
                    {!readOnly && onEditCondition && (
                      <button
                        type="button"
                        className="absolute right-14 top-2 rounded border bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCondition(index, childIdx);
                        }}
                        title={t("condition.editTitle")}
                      >
                        {t("condition.edit")}
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        type="button"
                        className="absolute right-2 top-2 rounded border bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextScenario = {
                            ...scenario,
                            children: (scenario.children ?? []).filter(
                              (_, idx) => idx !== childIdx
                            ),
                          };
                          onUpdate(nextScenario);
                        }}
                        title={t("condition.deleteTitle")}
                      >
                        {t("condition.delete")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {proximityEligible && (allowNear || allowOrder) && (
          <div className="mt-3 rounded-md border border-dashed bg-white/70 px-3 py-2 text-xs text-slate-600">
            <details
              className="group"
              open={proximityRelation !== "NONE"}
            >
              <summary className="cursor-pointer select-none text-sm font-medium text-slate-700">
                {"\u51fa\u73b0\u4f4d\u7f6e\u5173\u7cfb\uff08\u9ad8\u7ea7\uff09"}{" "}
                <span className="text-slate-400">{"\u25b8"}</span>
              </summary>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[12px] font-semibold text-slate-700">
                    {"\u8fd9\u4e9b\u6761\u4ef6\u5728\u6587\u6863\u4e2d\u9700\u8981\uff1a"}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                    {([
                      { id: "NONE", label: "\u65e0\u7279\u6b8a\u4f4d\u7f6e\u5173\u7cfb\uff08\u9ed8\u8ba4\uff09" },
                      allowNear
                        ? { id: "NEAR", label: "\u51fa\u73b0\u5728\u5f7c\u6b64\u9644\u8fd1" }
                        : null,
                      allowOrder
                        ? { id: "ORDER", label: "\u6309\u987a\u5e8f\u51fa\u73b0" }
                        : null,
                    ] as const).map((option) =>
                      option ? (
                        <label
                          key={option.id}
                          className={`inline-flex items-center gap-1 ${
                            readOnly ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`scenario-${index}-proximity-relation`}
                            value={option.id}
                            checked={proximityRelation === option.id}
                            disabled={readOnly}
                            onChange={() =>
                              handleProximityRelationChange(option.id)
                            }
                            className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                          />
                          {option.label}
                        </label>
                      ) : null
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {proximityRelation === "NEAR"
                      ? "\u51fa\u73b0\u5728\u5f7c\u6b64\u9644\u8fd1\uff1a\u6761\u4ef6\u4e4b\u95f4\u8ddd\u79bb\u8f83\u8fd1"
                      : proximityRelation === "ORDER"
                      ? "\u6309\u987a\u5e8f\u51fa\u73b0\uff1a\u6761\u4ef6\u51fa\u73b0\u7684\u5148\u540e\u987a\u5e8f\u9700\u4e00\u81f4"
                      : "\u9ed8\u8ba4\u4e0d\u505a\u4f4d\u7f6e\u5173\u7cfb\u9650\u5236"}
                  </div>
                </div>

                {proximityRelation === "NEAR" && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-[12px] font-semibold text-slate-700">
                        {"\u8ddd\u79bb\u8981\u6c42\uff1a"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                        {([
                          { id: "TIGHT", label: "\u5f88\u8fd1", value: 3 },
                          { id: "NEAR", label: "\u8f83\u8fd1", value: 8 },
                          { id: "CUSTOM", label: "\u81ea\u5b9a\u4e49" },
                        ] as const).map((option) => (
                          <label
                            key={option.id}
                            className={`inline-flex items-center gap-1 ${
                              readOnly ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`scenario-${index}-proximity-distance`}
                              value={option.id}
                              checked={
                                proximityConfig.distancePreset === option.id
                              }
                              disabled={readOnly}
                              onChange={() =>
                                handleDistancePresetChange(option.id)
                              }
                              className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                            />
                            {option.label}
                          </label>
                        ))}
                        {proximityConfig.distancePreset === "CUSTOM" && (
                          <label className="inline-flex items-center gap-1 text-[12px] text-slate-700">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className="w-16 rounded border px-1.5 py-0.5 text-[12px]"
                              value={proximityConfig.distance ?? 1}
                              disabled={readOnly}
                              onChange={(event) =>
                                handleCustomDistanceChange(
                                  Number(event.target.value)
                                )
                              }
                            />
                            {"\u8ddd\u79bb\u503c"}
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-semibold text-slate-700">
                        {"\u4f4d\u7f6e\u8303\u56f4\uff1a"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                        {([
                          { id: "SENTENCE", label: "\u540c\u4e00\u53e5\u4e2d" },
                          { id: "PARAGRAPH", label: "\u540c\u4e00\u6bb5\u4e2d" },
                          { id: "DOCUMENT", label: "\u6574\u4e2a\u6587\u6863\u4e2d" },
                        ] as const).map((option) => (
                          <label
                            key={option.id}
                            className={`inline-flex items-center gap-1 ${
                              readOnly ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`scenario-${index}-proximity-range`}
                              value={option.id}
                              checked={proximityConfig.range === option.id}
                              disabled={readOnly}
                              onChange={() =>
                                handleProximityRangeChange(option.id)
                              }
                              className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {proximityRelation === "ORDER" && (
                  <div className="space-y-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-600">
                      <div className="text-[12px] font-semibold text-slate-700">
                        {"\u987a\u5e8f\u8bf4\u660e\uff1a"}
                      </div>
                      <div className="mt-1">
                        {"\u5c06\u6309\u6761\u4ef6\u5217\u8868\u4ece\u4e0a\u5230\u4e0b\u7684\u987a\u5e8f\u8fdb\u884c\u5224\u65ad"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[12px] font-semibold text-slate-700">
                        {"\u4f4d\u7f6e\u8303\u56f4\uff1a"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                        {([
                          { id: "SENTENCE", label: "\u540c\u4e00\u53e5\u4e2d" },
                          { id: "PARAGRAPH", label: "\u540c\u4e00\u6bb5\u4e2d" },
                          { id: "DOCUMENT", label: "\u6574\u4e2a\u6587\u6863\u4e2d" },
                        ] as const).map((option) => (
                          <label
                            key={option.id}
                            className={`inline-flex items-center gap-1 ${
                              readOnly ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`scenario-${index}-proximity-order-range`}
                              value={option.id}
                              checked={proximityConfig.range === option.id}
                              disabled={readOnly}
                              onChange={() =>
                                handleProximityRangeChange(option.id)
                              }
                              className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                            />
                            {option.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        <GroupExplainEditor
          group={scenario}
          readOnly={readOnly}
          onChange={(nextScenario) => onUpdate(nextScenario)}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
      <div>{t("ruleBuilder.emptyState.title")}</div>
      <div className="mt-1 text-slate-600">
        {t("ruleBuilder.emptyState.hint")}
      </div>
    </div>
  );
}
