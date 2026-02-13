import type {
  LogicOperator,
  ProximityRelation,
  RuleField,
  UiCapabilityViewModel,
  UiExpressionNode,
  UiTermSetNode,
} from "./types";
import { t } from "@/i18n";

export function NodeInspector({
  node,
  readOnly,
  capability,
  onPatchNode,
  onEditTermSet,
}: {
  node: UiExpressionNode | null;
  readOnly: boolean;
  capability: UiCapabilityViewModel;
  onPatchNode: (nodeId: string, updater: (node: UiExpressionNode) => UiExpressionNode) => void;
  onEditTermSet: (node: UiTermSetNode) => void;
}) {
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
            return (
              <select
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={node.operator}
                onChange={(event) => {
                  const value = event.target.value as LogicOperator;
                  onPatchNode(node.id, (n) => (n.type === "LOGIC" ? { ...n, operator: value } : n));
                }}
                disabled={readOnly || options.length <= 1}
              >
                {options.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            );
          })()}
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
              onPatchNode(node.id, (n) => (n.type === "FIELD" ? { ...n, field: value } : n));
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

      {node.type === "PROXIMITY" && (
        <div className="space-y-2">
          <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.proximity.relation")}</div>
          <select
            className="h-9 w-full rounded-md border px-2 text-sm"
            value={node.relation}
            onChange={(event) => {
              const value = event.target.value as ProximityRelation;
              onPatchNode(node.id, (n) => (n.type === "PROXIMITY" ? { ...n, relation: value } : n));
            }}
            disabled={readOnly}
          >
            {capability.structure.allowRelation
              .filter((item): item is ProximityRelation => item !== "NONE")
              .map((item) => (
                <option key={item} value={item}>
                  {relationLabel(item)}
                </option>
              ))}
          </select>
          {node.relation === "NEAR" && capability.structure.allowDistance && (
            <div className="space-y-1">
              <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.proximity.distance")}</div>
              <input
                type="number"
                className="h-9 w-full rounded-md border px-2 text-sm"
                value={node.distance ?? 3}
                onChange={(event) =>
                  onPatchNode(node.id, (n) =>
                    n.type === "PROXIMITY" ? { ...n, distance: Number(event.target.value || 1) } : n
                  )
                }
                disabled={readOnly}
              />
            </div>
          )}
          {node.relation === "NEAR" && capability.structure.allowOrder && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={node.ordered}
                onChange={(event) =>
                  onPatchNode(node.id, (n) =>
                    n.type === "PROXIMITY" ? { ...n, ordered: event.target.checked } : n
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
          <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.term.matchMode")}</div>
          <select
            className="h-9 w-full rounded-md border px-2 text-sm"
            value={node.matchMode}
            onChange={(event) =>
              onPatchNode(node.id, (n) =>
                n.type === "TERM_SET" ? { ...n, matchMode: event.target.value as "ANY" | "ALL" } : n
              )
            }
            disabled={readOnly}
          >
            <option value="ANY">{t("ruleEditor.nodeInspector.term.mode.any")}</option>
            <option value="ALL">{t("ruleEditor.nodeInspector.term.mode.all")}</option>
          </select>

          <div className="rounded border bg-slate-50 p-2 text-xs text-slate-700">
            {t("ruleEditor.nodeInspector.term.label", {
              terms: node.terms.length ? node.terms.map((item) => item.conceptName).join("、") : t("ruleEditor.nodeInspector.term.empty"),
            })}
          </div>

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

      {node.type === "NOT" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.not.hint")}</div>}
      {node.type === "SCORE" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.score.hint")}</div>}
      {node.type === "TOPIC_REF" && <div className="text-xs text-slate-500">{t("ruleEditor.nodeInspector.topicRef.hint")}</div>}
    </div>
  );
}

function nodeTypeLabel(type: UiExpressionNode["type"]) {
  if (type === "LOGIC") return t("ruleEditor.nodeType.logic");
  if (type === "PROXIMITY") return t("ruleEditor.nodeType.proximity");
  if (type === "FIELD") return t("ruleEditor.nodeType.field");
  if (type === "TERM_SET") return t("ruleEditor.nodeType.termSet");
  if (type === "NOT") return t("ruleEditor.nodeType.not");
  if (type === "SCORE") return t("ruleEditor.nodeType.score");
  return t("ruleEditor.nodeType.topicRef");
}

function logicOptions(capability: UiCapabilityViewModel): Array<{ value: LogicOperator; label: string }> {
  const options: Array<{ value: LogicOperator; label: string }> = [];
  const allValue = capability.semantic.allowModes.find((m) => m === "ALL" || m === "AND");
  const anyValue = capability.semantic.allowModes.find((m) => m === "ANY" || m === "OR");
  if (allValue) options.push({ value: allValue, label: t("ruleBuilder.all") });
  if (anyValue) options.push({ value: anyValue, label: t("ruleBuilder.any") });
  if (capability.semantic.allowModes.includes("ACCRUE")) {
    options.push({ value: "ACCRUE", label: t("scenario.accrueSoft") });
  }
  return options.length ? options : [{ value: "AND", label: t("ruleBuilder.all") }];
}

function relationLabel(relation: ProximityRelation) {
  if (relation === "SENTENCE") return t("ruleEditor.tree.node.proximity.sentence");
  if (relation === "PARAGRAPH") return t("ruleEditor.tree.node.proximity.paragraph");
  return t("ruleEditor.tree.node.proximity.nearSimple");
}

function fieldLabel(field: RuleField) {
  if (field === "TITLE") return t("ruleEditor.tree.node.fieldOnly.title");
  if (field === "COLUMN") return t("ruleEditor.tree.node.fieldOnly.column");
  return t("ruleEditor.tree.node.fieldOnly.content");
}
