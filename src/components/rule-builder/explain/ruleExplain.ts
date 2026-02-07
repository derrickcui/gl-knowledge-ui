import { RuleNode } from "../astTypes";
import { buildGroupExplainModel } from "./groupExplain";
import { t } from "@/i18n";

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
      return `${t("ruleExplain.groupTitle", {
        index: idx + 1,
        priority,
      })}\n${text}`;
    })
    .join(t("ruleExplain.groupSeparator"));
}
