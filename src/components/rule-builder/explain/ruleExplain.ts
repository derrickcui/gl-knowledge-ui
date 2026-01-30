import { RuleNode } from "../astTypes";
import { buildGroupExplainModel } from "./groupExplain";

function getGroupExplainText(group: RuleNode): string {
  if (group.explain?.mode === "CUSTOM" && group.explain.text) {
    return group.explain.text;
  }
  const model = buildGroupExplainModel(group);
  if (!model.lines.length) {
    return model.header;
  }
  return `${model.header}\n${model.lines
    .map((line) => `- ${line.text}`)
    .join("\n")}`;
}

export function generateRuleExplain(rule: RuleNode): string {
  if (!rule.children || rule.children.length === 0) {
    return "";
  }

  const groups = [...rule.children].sort(
    (a, b) => (b.priority ?? 100) - (a.priority ?? 100)
  );

  if (groups.length === 1) {
    return getGroupExplainText(groups[0]);
  }

  return groups
    .map((group, idx) => {
      const text = getGroupExplainText(group);
      const priority = group.priority ?? 100;
      return `\u5224\u65ad\u573a\u666f ${idx + 1}\uff08\u4f18\u5148\u7ea7 ${priority}\uff09\uff1a\n${text}`;
    })
    .join("\n\n\u6216\n\n");
}
