import { RuleNode } from "../astTypes";

export type ExplainLine = {
  conditionId: string;
  text: string;
};

export type GroupExplainModel = {
  header: string;
  lines: ExplainLine[];
};

type ProximityRelation = "NONE" | "NEAR" | "ORDER";
type ProximityRange = "DOCUMENT" | "PARAGRAPH" | "SENTENCE";

type ScenarioProximityConfig = {
  relation?: ProximityRelation;
  range?: ProximityRange;
  distance?: number;
};

function getConditionExplain(node: RuleNode): string {
  if (node.explain?.text) {
    return node.explain.text;
  }
  return "\u6ee1\u8db3\u6307\u5b9a\u4e1a\u52a1\u6761\u4ef6";
}

type ImportanceLevel = "HIGH" | "NORMAL" | "LOW";

function normalizeImportance(raw: unknown): ImportanceLevel {
  if (raw === "HIGH" || raw === "LOW") return raw;
  return "NORMAL";
}

function hasTopicRef(node: RuleNode): boolean {
  if (node.type === "TOPIC_REF") return true;
  return (node.children ?? []).some((child) => hasTopicRef(child));
}

function hasImportanceOverride(group: RuleNode): boolean {
  return (group.children ?? []).some(
    (child) => normalizeImportance(child.params?.importance) !== "NORMAL"
  );
}

function collectConditionLabels(node: RuleNode, labels: string[] = []): string[] {
  if (node.type === "CONCEPT_MATCH" && node.params?.conceptName) {
    labels.push(node.params.conceptName);
  } else if (node.type === "TEXT_MATCH" && node.params?.value) {
    labels.push(String(node.params.value));
  } else if (node.type === "FIELD_CONDITION" && node.params?.value) {
    labels.push(String(node.params.value));
  } else if (node.type === "TOPIC_REF" && node.params?.topicName) {
    labels.push(node.params.topicName);
  }

  node.children?.forEach((child) => collectConditionLabels(child, labels));
  return labels;
}

function proximityRangeLabel(range?: ProximityRange) {
  if (range === "SENTENCE") return "\u540c\u4e00\u53e5\u4e2d";
  if (range === "PARAGRAPH") return "\u540c\u4e00\u6bb5\u4e2d";
  return "\u6587\u6863\u6b63\u6587\u4e2d";
}

function buildProximityExplainLine(group: RuleNode): string | null {
  const raw = group.params?.proximity as ScenarioProximityConfig | undefined;
  const relation = raw?.relation ?? "NONE";
  if (relation === "NONE") return null;
  if ((group.children?.length ?? 0) < 2) return null;
  const rangeText = proximityRangeLabel(raw?.range);
  if (relation === "ORDER") {
    return `\u5728${rangeText}\uff0c\u4e0a\u8ff0\u6761\u4ef6\u9700\u8981\u6309\u7ed9\u5b9a\u987a\u5e8f\u4f9d\u6b21\u51fa\u73b0\u3002`;
  }
  const labels = Array.from(
    new Set(
      (group.children ?? [])
        .flatMap((child) => collectConditionLabels(child))
        .filter(Boolean)
    )
  );
  if (labels.length === 0) {
    return `\u5728${rangeText}\uff0c\u4e0a\u8ff0\u6761\u4ef6\u9700\u8981\u51fa\u73b0\u5728\u5f7c\u6b64\u9644\u8fd1\u3002`;
  }
  const joined = labels.map((label) => `\u300c${label}\u300d`).join("");
  return `\u5728${rangeText}\uff0c${joined}\u9700\u8981\u51fa\u73b0\u5728\u5f7c\u6b64\u9644\u8fd1\u3002`;
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
  const importanceMode = group.params?.importanceMode === "IMPORTANCE";
  const legacyLogsum =
    normalized === "ACCRUE" && group.params?.mode === "LOGSUM";
  const thresholdRaw =
    normalized === "LOGSUM" || legacyLogsum
      ? group.params?.threshold ?? 2
      : undefined;
  const threshold =
    thresholdRaw !== undefined
      ? Math.max(2, Math.min(thresholdRaw, group.children.length))
      : undefined;
  const isTopicScene = hasTopicRef(group);
  const importanceActive =
    normalized === "LOGSUM" &&
    importanceMode &&
    !legacyLogsum &&
    !isTopicScene &&
    group.children.length >= 2;
  const header =
    normalized === "OR"
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u6ee1\u8db3\u4ee5\u4e0b\u4efb\u610f\u4e00\u6761\u6761\u4ef6\u5373\u53ef\uff1a"
      : normalized === "EXCLUDE"
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u82e5\u6ee1\u8db3\u4ee5\u4e0b\u6761\u4ef6\u5219\u6392\u9664\uff1a"
      : importanceActive
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u6ee1\u8db3\u4ee5\u4e0b\u6761\u4ef6\u5e76\u7efc\u5408\u91cd\u8981\u6027\u5224\u65ad\uff1a"
      : normalized === "ACCRUE" && !legacyLogsum
      ? "\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u5f53\u6ee1\u8db3\u591a\u4e2a\u5224\u65ad\u6761\u4ef6\u65f6\uff0c\u8be5\u5224\u65ad\u573a\u666f\u66f4\u5bb9\u6613\u88ab\u8ba4\u4e3a\u6210\u7acb\u3002"
      : normalized === "LOGSUM" || legacyLogsum
      ? `\u5728\u540c\u4e00\u5185\u5bb9\u8bed\u5883\u4e2d\uff0c\u540c\u65f6\u6ee1\u8db3\u4ee5\u4e0b\u6761\u4ef6\u4e2d\u7684\u81f3\u5c11 ${threshold} \u4e2a\uff1a`
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
  const base = `${model.header}\n${model.lines
    .map((line) => `- ${line.text}`)
    .join("\n")}`;
  const proximityLine = buildProximityExplainLine(group);
  const withProximity = proximityLine
    ? `${base}\n\n${proximityLine}`
    : base;
  const importanceMode = group.params?.importanceMode === "IMPORTANCE";
  const importanceActive =
    group.params?.operator === "LOGSUM" &&
    importanceMode &&
    !hasTopicRef(group) &&
    (group.children?.length ?? 0) >= 2;
  if (importanceActive && hasImportanceOverride(group)) {
    return `${withProximity}\n\n\u8bf4\u660e\uff1a\n\u5728\u8be5\u5224\u65ad\u573a\u666f\u4e2d\uff0c\u4e0d\u540c\u6761\u4ef6\u7684\u91cd\u8981\u6027\u4e0d\u540c\uff0c\n\u7cfb\u7edf\u5c06\u7efc\u5408\u5404\u6761\u4ef6\u7684\u91cd\u8981\u7a0b\u5ea6\u8fdb\u884c\u5224\u65ad\u3002`;
  }
  return withProximity;
}
