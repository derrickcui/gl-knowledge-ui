import { RuleNode } from "../astTypes";

export type ExplainLine = {
  conditionId: string;
  text: string;
};

export type GroupExplainModel = {
  header: string;
  lines: ExplainLine[];
};

function getConditionExplain(node: RuleNode): string {
  if (node.explain?.text) {
    return node.explain.text;
  }
  return "\u6ee1\u8db3\u6307\u5b9a\u4e1a\u52a1\u6761\u4ef6";
}

export function buildGroupExplainModel(group: RuleNode): GroupExplainModel {
  if (!group.children || group.children.length === 0) {
    return {
      header:
        "\u8be5\u5224\u65ad\u573a\u666f\u5c1a\u672a\u5b9a\u4e49\u5177\u4f53\u5224\u65ad\u6761\u4ef6\u3002",
      lines: [],
    };
  }

  const operator = group.params?.operator ?? "AND";
  const normalized =
    operator === "ALL"
      ? "AND"
      : operator === "ANY"
      ? "OR"
      : operator;
  const header =
    normalized === "OR"
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u6ee1\u8db3\u4ee5\u4e0b\u4efb\u610f\u4e00\u6761\u6761\u4ef6\u5373\u53ef\uff1a"
      : normalized === "EXCLUDE"
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u82e5\u6ee1\u8db3\u4ee5\u4e0b\u6761\u4ef6\u5219\u6392\u9664\uff1a"
      : "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u540c\u65f6\u6ee1\u8db3\u4ee5\u4e0b\u6761\u4ef6\uff1a";

  return {
    header,
    lines: group.children.map((child, index) => ({
      conditionId: child.id ?? `condition-${index}`,
      text: getConditionExplain(child),
    })),
  };
}

export function generateGroupExplain(group: RuleNode): string {
  const model = buildGroupExplainModel(group);
  if (!model.lines.length) {
    return model.header;
  }
  return `${model.header}\n${model.lines
    .map((line) => `- ${line.text}`)
    .join("\n")}`;
}
