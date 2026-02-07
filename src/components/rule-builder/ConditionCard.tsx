"use client";

import { RuleNode } from "./astTypes";
import { ActivePath } from "./pathUtils";
import { t } from "@/i18n";

type Location = "BODY" | "TITLE" | "PARAGRAPH" | "SENTENCE";

type Props = {
  node: RuleNode;
  path: ActivePath;
  activePath: ActivePath;
  highlighted?: boolean;
  selected?: boolean;
  readOnly?: boolean;
  showImportance?: boolean;
  importance?: "HIGH" | "NORMAL" | "LOW";
  onChangeImportance?: (next: "HIGH" | "NORMAL" | "LOW") => void;
  onSelect: (path: ActivePath) => void;
  onToggleNegation: (next: boolean) => void;
  allowNegate?: boolean;
};

function collectConceptNames(node: RuleNode, list: string[] = []): string[] {
  if (node.type === "CONCEPT_MATCH" && node.params?.conceptName) {
    list.push(node.params.conceptName);
  }
  node.children?.forEach((child) => collectConceptNames(child, list));
  return list;
}

function collectTopicNames(node: RuleNode, list: string[] = []): string[] {
  if (node.type === "TOPIC_REF" && node.params?.topicName) {
    list.push(node.params.topicName);
  }
  node.children?.forEach((child) => collectTopicNames(child, list));
  return list;
}

function findTopicRef(node: RuleNode): RuleNode | null {
  if (node.type === "TOPIC_REF") return node;
  for (const child of node.children ?? []) {
    const hit = findTopicRef(child);
    if (hit) return hit;
  }
  return null;
}

function gatherLocations(node: RuleNode, acc: Set<Location>) {
  if (node.type === "FIELD_CONDITION") {
    if (node.params?.field === "TITLE") {
      acc.add("TITLE");
    }
    node.children?.forEach((child) => gatherLocations(child, acc));
    return;
  }

  if (node.type === "PROXIMITY") {
    const mode = node.params?.mode;
    if (mode === "PARAGRAPH") acc.add("PARAGRAPH");
    else if (mode === "SENTENCE") acc.add("SENTENCE");
    node.children?.forEach((child) => gatherLocations(child, acc));
    return;
  }

  if (node.type === "GROUP" && node.params?.operator === "ANY") {
    node.children?.forEach((child) => gatherLocations(child, acc));
    return;
  }

  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => gatherLocations(child, acc));
    return;
  }

  acc.add("BODY");
}

function locationLabel(id: Location) {
  switch (id) {
    case "BODY":
      return t("conditionCard.location.body");
    case "TITLE":
      return t("conditionCard.location.title");
    case "PARAGRAPH":
      return t("conditionCard.location.paragraph");
    case "SENTENCE":
      return t("conditionCard.location.sentence");
  }
}

function buildExplainText(
  concepts: string[],
  locations: Location[],
  negated: boolean
) {
  const conceptText = concepts.length
    ? concepts.join(" / ")
    : t("conditionCard.concept.undefined");
  const locationText = locations.length
    ? locations.map(locationLabel).join(" / ")
    : t("conditionCard.location.body");
  if (negated) {
    return t("conditionCard.explain.negated", {
      locations: locationText,
      concepts: conceptText,
    });
  }
  return t("conditionCard.explain.positive", {
    locations: locationText,
    concepts: conceptText,
  });
}

function describeTopicScope(locations: Location[]) {
  const hasTitle = locations.includes("TITLE");
  const hasBody = locations.includes("BODY");
  const hasOther = locations.some(
    (loc) => loc === "PARAGRAPH" || loc === "SENTENCE"
  );
  if (hasTitle && hasBody && !hasOther) {
    return t("conditionCard.scope.documentAll");
  }
  if (hasTitle && !hasBody && !hasOther) {
    return t("conditionCard.scope.documentTitle");
  }
  if (hasBody && !hasTitle && !hasOther) {
    return t("conditionCard.scope.documentBody");
  }
  const locationText = locations.length
    ? locations.map(locationLabel).join(" / ")
    : t("conditionCard.scope.documentContent");
  return t("conditionCard.scope.documentWith", {
    locations: locationText,
  });
}

function buildTopicExplainText(
  topicName: string,
  locations: Location[],
  negated: boolean
) {
  const scope = describeTopicScope(locations);
  if (negated) {
    return t("conditionCard.topicExplain.negated", {
      scope,
      topic: topicName,
    });
  }
  return t("conditionCard.topicExplain.positive", {
    scope,
    topic: topicName,
  });
}

const containerClassFor = (selected: boolean, highlighted: boolean) =>
  selected
    ? "border-blue-500 bg-blue-50"
    : highlighted
    ? "border-amber-400 bg-amber-50"
    : "border-slate-200 bg-white";

export default function ConditionCard({
  node,
  path,
  onSelect,
  onToggleNegation,
  showImportance = false,
  importance,
  onChangeImportance,
  selected = false,
  highlighted = false,
  readOnly = false,
  allowNegate = true,
}: Props) {
  const conceptNames = collectConceptNames(node);
  const topicNames = collectTopicNames(node);
  const topicNode = findTopicRef(node);
  const isTopic = topicNames.length > 0;
  const locationSet = new Set<Location>();
  gatherLocations(node, locationSet);
  if (locationSet.size === 0) {
    locationSet.add("BODY");
  }

  const locations = Array.from(locationSet);
  const explainText = isTopic
    ? buildTopicExplainText(
        topicNames[0] ?? t("conditionCard.topic.undefined"),
        locations,
        !!node.params?.negated
      )
    : buildExplainText(conceptNames, locations, !!node.params?.negated);
  const negated = !!node.params?.negated;
  const selectedImportance =
    (importance ?? node.params?.importance ?? "NORMAL") as
      | "HIGH"
      | "NORMAL"
      | "LOW";

  const containerClass = containerClassFor(selected, highlighted);
  const topicStatus = topicNode?.params?.topicStatus;
  const topicVersion = topicNode?.params?.topicVersion;
  const topicStatusLabel =
    topicStatus === "PUBLISHED"
      ? t("topics.status.published")
      : topicStatus;
  const locationOptions: { id: Location; label: string }[] = [
    { id: "BODY", label: t("conditionCard.location.body") },
    { id: "TITLE", label: t("conditionCard.location.title") },
    { id: "PARAGRAPH", label: t("conditionCard.location.paragraph") },
    { id: "SENTENCE", label: t("conditionCard.location.sentence") },
  ];

  return (
    <div
      className={`rounded border px-3 py-3 text-left text-xs text-slate-600 ${containerClass}`}
      data-path={path.join("-")}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(path);
      }}
    >
      <div className="flex items-center justify-between text-sm text-slate-900">
        <div className="font-semibold">
          {isTopic
            ? t("conditionCard.title.topic")
            : t("conditionCard.title.condition")}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {negated
            ? t("conditionCard.negation.exclude")
            : t("conditionCard.negation.normal")}
        </span>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        {isTopic
          ? t("conditionCard.subtitle.topic")
          : t("conditionCard.subtitle.concept")}
      </div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">
        {isTopic
          ? topicNames[0] ?? t("conditionCard.undefined")
          : conceptNames.length > 0
          ? conceptNames.join(" / ")
          : t("conditionCard.undefined")}
      </div>
      {isTopic && (topicStatus || topicVersion) && (
        <div className="mt-1 text-[11px] text-slate-500">
          {topicStatusLabel
            ? t("conditionCard.topicStatus", {
                status: topicStatusLabel,
              })
            : null}
          {topicStatus && topicVersion ? " \u00b7 " : null}
          {topicVersion ? `v${topicVersion}` : null}
        </div>
      )}

      <div className="mt-3 text-[11px] text-slate-500">
        {isTopic
          ? t("conditionCard.scopeLabel")
          : t("conditionCard.locationLabel")}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {locationOptions.map((option) => {
          const active = locations.includes(option.id);
          return (
            <span
              key={option.id}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide transition ${
                active
                  ? "border-slate-400 bg-slate-100 text-slate-900"
                  : "border-slate-100 bg-transparent text-slate-400"
              }`}
            >
              {option.label}
            </span>
          );
        })}
      </div>

      {showImportance && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-700">
          <span className="text-[11px] text-slate-500">
            {t("conditionCard.importanceLabel")}
          </span>
          {([
            { id: "HIGH", label: t("conditionCard.importance.high") },
            { id: "NORMAL", label: t("conditionCard.importance.normal") },
            { id: "LOW", label: t("conditionCard.importance.low") },
          ] as const).map((option) => (
            <label
              key={option.id}
              className={`inline-flex items-center gap-1 ${
                readOnly ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <input
                type="radio"
                name={`importance-${node.id ?? path.join("-")}`}
                value={option.id}
                checked={selectedImportance === option.id}
                disabled={readOnly}
                onChange={(event) => {
                  event.stopPropagation();
                  if (readOnly) return;
                  onChangeImportance?.(option.id);
                }}
                className="h-3 w-3 border-slate-300 text-blue-600 focus:ring-0"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}

      {allowNegate && (
        <div className="mt-3 flex items-center justify-between">
          <label className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-0"
              checked={negated}
              disabled={readOnly}
              onChange={(event) => {
                event.stopPropagation();
                if (readOnly) return;
                onToggleNegation(!negated);
              }}
            />
            {t("conditionCard.negation.toggle")}
          </label>
          <span className="text-[10px] text-slate-500">
            {negated
              ? t("conditionCard.negation.hintExclude")
              : t("conditionCard.negation.hintNormal")}
          </span>
        </div>
      )}

      <div className="mt-3 text-[11px] text-slate-500">
        {t("conditionCard.explainLabel")}
      </div>
      <div className="mt-0.5 text-xs text-slate-700">{explainText}</div>
    </div>
  );
}
