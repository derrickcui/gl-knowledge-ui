import { RuleNode } from "../astTypes";
import { t } from "@/i18n";

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
  return t("groupExplain.condition.default");
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
  if (range === "SENTENCE") return t("groupExplain.proximity.range.sentence");
  if (range === "PARAGRAPH") return t("groupExplain.proximity.range.paragraph");
  return t("groupExplain.proximity.range.document");
}

function buildProximityExplainLine(group: RuleNode): string | null {
  const raw = group.params?.proximity as ScenarioProximityConfig | undefined;
  const relation = raw?.relation ?? "NONE";
  if (relation === "NONE") return null;
  if ((group.children?.length ?? 0) < 2) return null;
  const rangeText = proximityRangeLabel(raw?.range);
  if (relation === "ORDER") {
    return t("groupExplain.proximity.order", { range: rangeText });
  }
  const labels = Array.from(
    new Set(
      (group.children ?? [])
        .flatMap((child) => collectConditionLabels(child))
        .filter(Boolean)
    )
  );
  if (labels.length === 0) {
    return t("groupExplain.proximity.near", { range: rangeText });
  }
  const joined = labels.map((label) => `\u300c${label}\u300d`).join("");
  return t("groupExplain.proximity.nearWith", {
    range: rangeText,
    labels: joined,
  });
}

export function buildGroupExplainModel(group: RuleNode): GroupExplainModel {
  if (!group.children || group.children.length === 0) {
    return {
      header: t("groupExplain.header.empty"),
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
      ? t("groupExplain.header.any")
      : normalized === "EXCLUDE"
      ? t("groupExplain.header.exclude")
      : importanceActive
      ? t("groupExplain.header.importance")
      : normalized === "ACCRUE" && !legacyLogsum
      ? t("groupExplain.header.accrue")
      : normalized === "LOGSUM" || legacyLogsum
      ? t("groupExplain.header.logsum", { threshold: threshold ?? 2 })
      : t("groupExplain.header.all");

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
    return `${withProximity}\n\n${t("groupExplain.importance.note")}`;
  }
  return withProximity;
}
