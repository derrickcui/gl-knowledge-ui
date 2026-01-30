"use client";

import { Trash2, CopyPlus } from "lucide-react";

import ConditionCard from "@/components/rule-builder/ConditionCard";
import { RuleNode } from "@/components/rule-builder/astTypes";
import { ActivePath, isSamePath } from "@/components/rule-builder/pathUtils";
import {
  removeScenario,
  normalizeForRuleBuilder,
} from "@/components/rule-builder/ruleGroupOps";
import { GroupExplainEditor } from "@/components/rule-builder/GroupExplainEditor";
import { GroupPriorityEditor } from "@/components/rule-builder/GroupPriorityEditor";
import { t } from "@/i18n";

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
  onSelect: (path: ActivePath) => void;
  onDelete: () => void;
  onUpdate: (nextScenario: RuleNode) => void;
  onEditCondition?: (scenarioIndex: number, conditionIndex: number) => void;
}) {
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

  const scenarioPath: ActivePath = [index];
  const selectedScenario = activePath.length > 0 && activePath[0] === index;
  const scenarioTitle =
    scenario.params?.title || t("scenario.title", { index: index + 1 });
  const rawScenarioOperator = scenario.params?.operator ?? "AND";
  const scenarioOperator =
    rawScenarioOperator === "ALL"
      ? "AND"
      : rawScenarioOperator === "ANY"
      ? "OR"
      : rawScenarioOperator;
  const scenarioOperatorLabel =
    scenarioOperator === "OR"
      ? t("scenario.operator.anyLabel")
      : t("scenario.operator.allLabel");
  const scenarioSummary =
    scenarioOperator === "OR"
      ? t("scenario.summary.any")
      : t("scenario.summary.all");

  const handleScenarioOperatorChange = (nextOperator: "AND" | "OR") => {
    if (readOnly) return;
    const nextScenario = {
      ...scenario,
      params: {
        ...scenario.params,
        operator: nextOperator,
      },
    };
    onUpdate(nextScenario);
  };

  const isEmpty = !scenario.children || scenario.children.length === 0;

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
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="text-[11px] font-medium text-slate-600">
              {t("scenario.conditionsLabel")}
            </span>
            {(["AND", "OR"] as const).map((value) => (
              <label
                key={value}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700"
              >
                <input
                  type="radio"
                  name={`scenario-${index}-operator`}
                  value={value}
                  checked={scenarioOperator === value}
                  disabled={readOnly}
                  onChange={() => handleScenarioOperatorChange(value)}
                  className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
                />
                {value === "AND" ? t("scenario.and") : t("scenario.or")}
              </label>
            ))}
          </div>
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
