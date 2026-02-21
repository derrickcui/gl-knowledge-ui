import type {
  LogicOperator,
  RuleField,
  StructureScope,
  UiCapabilityViewModel,
  UiExpressionNode,
  UiTermSetNode,
} from "./types";
import { t } from "@/i18n";
import { canUseLogicOperator } from "./capability-policy";
import { useCapability } from "./CapabilityContext";

export function NodeInspector({
  node,
  readOnly,
  onPatchNode,
  onChangeField,
  onEditTermSet,
}: {
  node: UiExpressionNode | null;
  readOnly: boolean;
  onPatchNode: (nodeId: string, updater: (node: UiExpressionNode) => UiExpressionNode) => void;
  onChangeField: (nodeId: string, field: RuleField) => void;
  onEditTermSet: (node: UiTermSetNode) => void;
}) {
  const capability = useCapability();
  if (!node) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-slate-500">
        {t("ruleEditor.nodeInspector.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.nodeInspector.title")}</div>
      <div className="text-xs text-slate-500">
        {t("ruleEditor.nodeInspector.nodeType", { type: nodeTypeLabel(node.type) })}
      </div>

      {node.type === "LOGIC" && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.logic.mode")}</div>
          {(() => {
            const options = logicOptions(capability);
            const selectedValue =
              options.find((item) => item.value === node.operator)?.value ??
              (node.operator === "WEIGHTED" ? options.find((item) => item.value === "LOGSUM")?.value : undefined) ??
              options[0]?.value ??
              "AND";
            const needTwoChildren =
              node.children.length < 2 &&
              (selectedValue === "AT_LEAST" ||
                selectedValue === "ACCRUE" ||
                selectedValue === "LOGSUM" ||
                selectedValue === "WEIGHTED");
            return (
              <>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  value={selectedValue}
                  onChange={(event) => {
                    const value = event.target.value as LogicOperator;
                    onPatchNode(node.id, (n) => {
                      if (n.type !== "LOGIC") return n;
                      const shouldUseThreshold = value === "AT_LEAST";
                      const shouldUseImportance = value === "LOGSUM" || value === "WEIGHTED";
                      const nextThreshold = shouldUseThreshold
                        ? clampThreshold(n.threshold ?? defaultThreshold(n.children.length), n.children.length)
                        : undefined;
                      return {
                        ...n,
                        operator: value,
                        threshold: nextThreshold,
                        children: shouldUseImportance
                          ? n.children.map((child) => ensureImportance(child))
                          : n.children.map((child) => stripTermImportance(child)),
                      };
                    });
                  }}
                  disabled={readOnly || options.length <= 1}
                >
                  {options.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {needTwoChildren && (
                  <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
                    {t("ruleEditor.logic.modeNeedTwoWarning")}
                  </div>
                )}
              </>
            );
          })()}

          {node.operator === "AT_LEAST" && (
            <div className="space-y-1 pt-1">
              <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.logic.thresholdHint")}</div>
              <input
                type="number"
                min={1}
                max={Math.max(1, node.children.length)}
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={Math.round(Number(node.threshold ?? defaultThreshold(node.children.length)))}
                onChange={(event) => {
                  const raw = Number(event.target.value || 1);
                  onPatchNode(node.id, (n) =>
                    n.type === "LOGIC" ? { ...n, threshold: clampThreshold(raw, n.children.length) } : n
                  );
                }}
                disabled={readOnly}
              />
            </div>
          )}
        </div>
      )}

      {node.type === "FIELD" && capability.where.allowFields.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.field.scope")}</div>
          <select
            className="h-9 w-full rounded-md border px-2 text-sm"
            value={node.field}
            onChange={(event) => {
              const value = event.target.value as RuleField;
              onChangeField(node.id, value);
            }}
            disabled={readOnly || capability.where.allowFields.length <= 1}
          >
            {capability.where.allowFields.map((field) => (
              <option key={field} value={field}>
                {fieldLabel(field)}
              </option>
            ))}
          </select>
        </div>
      )}

      {node.type === "STRUCTURE" && (
        <div className="space-y-1">
          {(() => {
            const options = ["DOCUMENT", "SENTENCE", "PARAGRAPH"] as const;
            return (
              <>
                <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.structure.scope")}</div>
                <select
                  className="h-9 w-full rounded-md border px-2 text-sm"
                  value={node.scope}
                  onChange={(event) => {
                    const value = event.target.value as "DOCUMENT" | "SENTENCE" | "PARAGRAPH";
                    onPatchNode(node.id, (next) =>
                      next.type === "STRUCTURE" ? { ...next, scope: value } : next
                    );
                  }}
                  disabled={readOnly}
                >
                  {options.map((scope) => (
                    <option key={scope} value={scope}>
                      {structureScopeLabel(scope)}
                    </option>
                  ))}
                </select>
              </>
            );
          })()}
        </div>
      )}

      {node.type === "POSITION_RELATION" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.proximity.relation")}</div>
            <select
              className="h-9 w-full rounded-md border px-2 text-sm"
              value={node.relation ?? "NEAR"}
              onChange={(event) =>
                onPatchNode(node.id, (n) =>
                  n.type === "POSITION_RELATION"
                    ? {
                        ...n,
                        mode: "PROXIMITY",
                        relation: event.target.value as "NEAR" | "SENTENCE" | "PARAGRAPH",
                        distance: event.target.value === "NEAR" ? n.distance ?? 5 : undefined,
                        strict: undefined,
                      }
                    : n
                )
              }
              disabled={readOnly}
            >
              {capability.structure.allowRelation.includes("SENTENCE") && (
                <option value="SENTENCE">{t("ruleEditor.positionEditor.range.sentence")}</option>
              )}
              {capability.structure.allowRelation.includes("PARAGRAPH") && (
                <option value="PARAGRAPH">{t("ruleEditor.positionEditor.range.paragraph")}</option>
              )}
              {(capability.structure.allowRelation.includes("NEAR") || capability.structure.allowDistance) && (
                <option value="NEAR">{t("ruleEditor.positionEditor.range.near")}</option>
              )}
            </select>
          </div>
          {capability.structure.allowDistance && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.proximity.distance")}</div>
              <input
                type="number"
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={node.distance ?? 3}
                onChange={(event) =>
                  onPatchNode(node.id, (n) =>
                    n.type === "POSITION_RELATION"
                      ? {
                          ...n,
                          mode: "PROXIMITY",
                          relation: n.relation ?? "NEAR",
                          distance: Number(event.target.value || 1),
                          strict: undefined,
                        }
                      : n
                  )
                }
                disabled={readOnly || (node.relation ?? "NEAR") !== "NEAR"}
              />
            </div>
          )}
          {capability.structure.allowOrder && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(node.ordered)}
                onChange={(event) =>
                  onPatchNode(node.id, (n) =>
                    n.type === "POSITION_RELATION"
                      ? {
                          ...n,
                          mode: "PROXIMITY",
                          relation: n.relation ?? "NEAR",
                          ordered: event.target.checked,
                          strict: undefined,
                        }
                      : n
                  )
                }
                disabled={readOnly}
              />
              {t("ruleEditor.nodeInspector.proximity.order")}
            </label>
          )}
        </div>
      )}

      {node.type === "TERM_SET" && (
        <div className="space-y-2">
          {node.terms.length > 1 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.term.matchMode")}</div>
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={node.matchMode}
                onChange={(event) => {
                  const value = event.target.value as "ANY" | "ALL";
                  onPatchNode(node.id, (n) => (n.type === "TERM_SET" ? { ...n, matchMode: value } : n));
                }}
                disabled={readOnly}
              >
                <option value="ANY">{t("ruleEditor.nodeInspector.term.mode.any")}</option>
                <option value="ALL">{t("ruleEditor.nodeInspector.term.mode.all")}</option>
              </select>
            </div>
          )}

          <div className="rounded border bg-slate-50 p-2 text-xs text-slate-700">
            {t("ruleEditor.nodeInspector.term.label", {
              terms: node.terms.length
                ? node.terms.map((item) => item.conceptName).join(", ")
                : t("ruleEditor.nodeInspector.term.empty"),
            })}
          </div>
          {node.terms.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.term.weight")}</div>
              <input
                type="number"
                min={0.1}
                step={0.1}
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={Number.isFinite(node.weight) && (node.weight ?? 0) > 0 ? node.weight : 1}
                onChange={(event) => {
                  const parsed = Number(event.target.value);
                  const nextWeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
                  onPatchNode(node.id, (n) =>
                    n.type === "TERM_SET"
                      ? {
                          ...n,
                          weight: nextWeight,
                          importanceWeight: nextWeight,
                        }
                      : n
                  );
                }}
                disabled={readOnly}
              />
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => onEditTermSet(node)}
            >
              {t("ruleEditor.tree.term.select")}
            </button>
          )}
        </div>
      )}

      {node.type === "PROXIMITY" && (
        <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.proximity.legacyHint")}</div>
      )}
      {node.type === "NOT" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.not.hint")}</div>}
      {node.type === "SCORE" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.score.hint")}</div>}
      {node.type === "TOPIC_REF" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.topicRef.hint")}</div>}
    </div>
  );
}

function nodeTypeLabel(type: UiExpressionNode["type"]) {
  if (type === "LOGIC") return t("ruleEditor.nodeType.logic");
  if (type === "STRUCTURE") return t("ruleEditor.nodeType.structure");
  if (type === "POSITION_RELATION") return t("ruleEditor.nodeType.positionRelation");
  if (type === "PROXIMITY") return t("ruleEditor.nodeType.proximity");
  if (type === "FIELD") return t("ruleEditor.nodeType.field");
  if (type === "TERM_SET") return t("ruleEditor.nodeType.termSet");
  if (type === "NOT") return t("ruleEditor.nodeType.not");
  if (type === "SCORE") return t("ruleEditor.nodeType.score");
  return t("ruleEditor.nodeType.topicRef");
}

function logicOptions(capability: UiCapabilityViewModel): Array<{ value: LogicOperator; label: string }> {
  const options: Array<{ value: LogicOperator; label: string }> = [];
  if (canUseLogicOperator(capability, "ALL")) {
    options.push({ value: "ALL", label: t("ruleEditor.capability.mode.all") });
  }
  if (canUseLogicOperator(capability, "ANY")) {
    options.push({ value: "ANY", label: t("ruleEditor.capability.mode.any") });
  }
  if (canUseLogicOperator(capability, "AT_LEAST")) {
    options.push({ value: "AT_LEAST", label: t("ruleEditor.capability.mode.atLeast") });
  }
  if (canUseLogicOperator(capability, "LOGSUM")) {
    options.push({ value: "LOGSUM", label: t("ruleEditor.capability.mode.weighted") });
  }
  if (canUseLogicOperator(capability, "ACCRUE")) {
    options.push({ value: "ACCRUE", label: t("ruleEditor.capability.mode.accrue") });
  }
  return options.length ? options : [{ value: "ALL", label: t("ruleEditor.capability.mode.all") }];
}

function structureScopeLabel(scope: StructureScope) {
  if (scope === "SENTENCE") return t("ruleEditor.structureScope.sentence");
  if (scope === "PARAGRAPH") return t("ruleEditor.structureScope.paragraph");
  return t("ruleEditor.structureScope.none");
}

function fieldLabel(field: RuleField) {
  if (field === "TITLE") return t("ruleEditor.tree.node.fieldOnly.title");
  if (field === "COLUMN") return t("ruleEditor.tree.node.fieldOnly.column");
  return t("ruleEditor.tree.node.fieldOnly.content");
}

function defaultThreshold(childCount: number) {
  return childCount >= 2 ? 2 : 1;
}

function clampThreshold(value: number, childCount: number) {
  const min = 1;
  const max = Math.max(1, childCount);
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));
}

function ensureImportance(node: UiExpressionNode): UiExpressionNode {
  if (node.type !== "TERM_SET") {
    return node;
  }
  return {
    ...node,
    importance: node.importance ?? "NORMAL",
    importanceWeight: node.importanceWeight ?? 5,
    weight: node.weight ?? 5,
  };
}

function stripTermImportance(node: UiExpressionNode): UiExpressionNode {
  if (node.type !== "TERM_SET") return node;
  const { importance, importanceWeight, ...rest } = node;
  void importance;
  void importanceWeight;
  return rest;
}
