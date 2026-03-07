import type { UiCapabilityViewModel } from "./types";
import type { BuilderSelection } from "./BusinessRuleBuilderPanel";
import type { BlockRelation, BuilderMode, BuilderStructure } from "./builder-model";

export function SelectionPropertyPanel({
  selection,
  structure,
  capability,
  readOnly,
  onChangeMode,
  onChangeStructure,
}: {
  selection: BuilderSelection;
  structure: BuilderStructure;
  capability: UiCapabilityViewModel;
  readOnly: boolean;
  onChangeMode: (mode: BuilderMode) => void;
  onChangeStructure: (patch: Partial<BuilderStructure>) => void;
}) {
  const modeOptions = availableModeOptions(capability);
  const relationOptions = availableRelationOptions(capability);
  const showRelationSection = relationOptions.some((relation) => relation !== "NONE");
  const fieldOptions = capability.where.allowFields;

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">规则整体设置</div>
      <div className="mt-3 space-y-3 text-sm">
        <div className="text-xs font-medium text-slate-700">第一层：规则生效范围</div>
        {fieldOptions.length > 1 && (
          <div>
            <div className="text-xs text-slate-500">识别范围</div>
            <div className="mt-1 flex flex-wrap gap-3">
              {fieldOptions.map((field) => (
                <label key={field} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={structure.field === field}
                    onChange={() => onChangeStructure({ field })}
                    disabled={readOnly}
                  />
                  {fieldLabel(field)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs font-medium text-slate-700">第二层：判断方式</div>
        <div>
          <div className="text-xs text-slate-500">成立方式</div>
          <div className="mt-1 flex flex-wrap gap-3">
            {modeOptions.map((item) => (
              <label key={item.mode} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={selection.mode === item.mode}
                  onChange={() => onChangeMode(item.mode)}
                  disabled={readOnly}
                />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div className="text-xs font-medium text-slate-700">第三层：条件组合方式</div>
        {showRelationSection && (
          <div>
            <div className="text-xs text-slate-500">条件之间的关系</div>
            <div className="mt-1 flex flex-wrap gap-3">
              {relationOptions.map((relation) => (
                <label key={relation} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={structure.relation === relation}
                    onChange={() => onChangeStructure({ relation })}
                    disabled={readOnly}
                  />
                  {relationLabel(relation)}
                </label>
              ))}
            </div>
          </div>
        )}

        {structure.relation === "NEAR" && capability.structure.allowDistance && (
          <div>
            <div className="text-xs text-slate-500">距离（词）</div>
            <input
              type="number"
              className="mt-1 h-8 w-24 rounded border px-2 text-sm"
              min={1}
              value={structure.distance}
              onChange={(e) => onChangeStructure({ distance: Math.max(1, Number(e.target.value || 1)) })}
              disabled={readOnly}
            />
          </div>
        )}

        {structure.relation === "NEAR" && capability.structure.allowOrder && (
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={structure.ordered}
              onChange={(e) => onChangeStructure({ ordered: e.target.checked })}
              disabled={readOnly}
            />
            保持词序
          </label>
        )}
      </div>
    </div>
  );
}

function fieldLabel(field: "CONTENT" | "TITLE" | "COLUMN") {
  if (field === "TITLE") return "标题";
  if (field === "COLUMN") return "栏目";
  return "正文";
}

function relationLabel(relation: "NONE" | "NEAR" | "SENTENCE" | "PARAGRAPH" | "ORDER") {
  if (relation === "NEAR") return "彼此靠近";
  if (relation === "SENTENCE") return "同一句";
  if (relation === "PARAGRAPH") return "同一段";
  if (relation === "ORDER") return "按顺序";
  return "无特殊关系";
}

function availableModeOptions(capability: UiCapabilityViewModel): Array<{ mode: BuilderMode; label: string }> {
  const list: Array<{ mode: BuilderMode; label: string }> = [];
  if (capability.semantic.allowModes.some((m) => m === "OR" || m === "ANY")) {
    list.push({ mode: "ANY", label: "任一情况满足" });
  }
  if (capability.semantic.allowModes.some((m) => m === "AND" || m === "ALL")) {
    list.push({ mode: "ALL", label: "必须全部满足" });
  }
  if (capability.semantic.allowModes.includes("ACCRUE")) {
    list.push({ mode: "ACCRUE", label: "满足越多越容易成立" });
  }
  return list.length ? list : [{ mode: "ANY", label: "任一情况满足" }];
}

function availableRelationOptions(capability: UiCapabilityViewModel): BlockRelation[] {
  const list: BlockRelation[] = ["NONE"];
  if (capability.structure.allowRelation.includes("NEAR")) list.push("NEAR");
  if (capability.structure.allowRelation.includes("SENTENCE")) list.push("SENTENCE");
  if (capability.structure.allowRelation.includes("PARAGRAPH")) list.push("PARAGRAPH");
  return list;
}
