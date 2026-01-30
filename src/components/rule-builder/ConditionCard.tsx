"use client";

import { RuleNode } from "./astTypes";
import { ActivePath } from "./pathUtils";

type Location = "BODY" | "TITLE" | "PARAGRAPH" | "SENTENCE";

const LOCATION_OPTIONS: { id: Location; label: string }[] = [
  { id: "BODY", label: "\u6587\u6863\u6b63\u6587" },
  { id: "TITLE", label: "\u6807\u9898" },
  { id: "PARAGRAPH", label: "\u540c\u4e00\u6bb5" },
  { id: "SENTENCE", label: "\u540c\u4e00\u53e5" },
];

type Props = {
  node: RuleNode;
  path: ActivePath;
  activePath: ActivePath;
  highlighted?: boolean;
  selected?: boolean;
  readOnly?: boolean;
  onSelect: (path: ActivePath) => void;
  onToggleNegation: (next: boolean) => void;
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
      return "\u6587\u6863\u6b63\u6587";
    case "TITLE":
      return "\u6807\u9898";
    case "PARAGRAPH":
      return "\u540c\u4e00\u6bb5";
    case "SENTENCE":
      return "\u540c\u4e00\u53e5";
  }
}

function buildExplainText(
  concepts: string[],
  locations: Location[],
  negated: boolean
) {
  const conceptText = concepts.length
    ? concepts.join(" / ")
    : "\u672a\u5b9a\u4e49\u7684\u6982\u5ff5";
  const locationText = locations.length
    ? locations.map(locationLabel).join(" / ")
    : "\u6587\u6863\u6b63\u6587";
  if (negated) {
    return `\u4e0d\u5e94\u5728\u3010${locationText}\u3011\u4e2d\u51fa\u73b0\u201c${conceptText}\u201d\u3002`;
  }
  return `\u5f53\u3010${locationText}\u3011\u4e2d\u63d0\u5230\u201c${conceptText}\u201d\u65f6\uff0c\u8be5\u6761\u4ef6\u6210\u7acb\u3002`;
}

function describeTopicScope(locations: Location[]) {
  const hasTitle = locations.includes("TITLE");
  const hasBody = locations.includes("BODY");
  const hasOther = locations.some(
    (loc) => loc === "PARAGRAPH" || loc === "SENTENCE"
  );
  if (hasTitle && hasBody && !hasOther) {
    return "\u6587\u6863\u5185\u5bb9\u6574\u4f53";
  }
  if (hasTitle && !hasBody && !hasOther) {
    return "\u6587\u6863\u6807\u9898\u5185\u5bb9";
  }
  if (hasBody && !hasTitle && !hasOther) {
    return "\u6587\u6863\u6b63\u6587\u5185\u5bb9";
  }
  const locationText = locations.length
    ? locations.map(locationLabel).join(" / ")
    : "\u6587\u6863\u5185\u5bb9";
  return `\u6587\u6863${locationText}\u5185\u5bb9`;
}

function buildTopicExplainText(
  topicName: string,
  locations: Location[],
  negated: boolean
) {
  const scope = describeTopicScope(locations);
  if (negated) {
    return `\u4e0d\u5e94\u5728${scope}\u7b26\u5408\u4e3b\u9898\u300c${topicName}\u300d\u7684\u5b9a\u4e49\u89c4\u5219\u3002`;
  }
  return `\u5f53${scope}\u7b26\u5408\u4e3b\u9898\u300c${topicName}\u300d\u7684\u5b9a\u4e49\u89c4\u5219\u65f6\uff0c\u8be5\u6761\u4ef6\u6210\u7acb\u3002`;
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
  selected = false,
  highlighted = false,
  readOnly = false,
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
        topicNames[0] ?? "\u672a\u5b9a\u4e49\u7684\u4e3b\u9898",
        locations,
        !!node.params?.negated
      )
    : buildExplainText(conceptNames, locations, !!node.params?.negated);
  const negated = !!node.params?.negated;

  const containerClass = containerClassFor(selected, highlighted);
  const topicStatus = topicNode?.params?.topicStatus;
  const topicVersion = topicNode?.params?.topicVersion;
  const topicStatusLabel =
    topicStatus === "PUBLISHED" ? "\u5df2\u53d1\u5e03" : topicStatus;

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
            ? "\uD83D\uDCD8 \u4e3b\u9898\u6761\u4ef6"
            : "\u2714 \u6761\u4ef6"}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">
          {negated ? "\u6392\u9664" : "\u5e38\u89c4"}
        </span>
      </div>

      <div className="mt-2 text-[11px] text-slate-500">
        {isTopic ? "\u7b26\u5408\u4e3b\u9898" : "\u6d89\u53ca\u4e1a\u52a1\u6982\u5ff5"}
      </div>
      <div className="mt-0.5 text-sm font-medium text-slate-900">
        {isTopic
          ? topicNames[0] ?? "\u672a\u5b9a\u4e49"
          : conceptNames.length > 0
          ? conceptNames.join(" / ")
          : "\u672a\u5b9a\u4e49"}
      </div>
      {isTopic && (topicStatus || topicVersion) && (
        <div className="mt-1 text-[11px] text-slate-500">
          {topicStatusLabel ? `\u72b6\u6001\uff1a${topicStatusLabel}` : null}
          {topicStatus && topicVersion ? " \u00b7 " : null}
          {topicVersion ? `v${topicVersion}` : null}
        </div>
      )}

      <div className="mt-3 text-[11px] text-slate-500">
        {isTopic ? "\u5224\u5b9a\u8303\u56f4" : "\u51fa\u73b0\u4f4d\u7f6e"}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {LOCATION_OPTIONS.map((option) => {
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
          {"\u6392\u9664\u8be5\u6761\u4ef6"}
        </label>
        <span className="text-[10px] text-slate-500">
          {negated ? "\u4e0d\u5e94\u547d\u4e2d" : "\u547d\u4e2d\u65f6\u6210\u7acb"}
        </span>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        {"\u8bf4\u660e"}
      </div>
      <div className="mt-0.5 text-xs text-slate-700">{explainText}</div>
    </div>
  );
}
