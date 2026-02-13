"use client";

import { t } from "@/i18n";
import { useState } from "react";
import type { UiCapabilityViewModel } from "./types";

function modeLabel(mode: string) {
  switch (mode) {
    case "AND":
    case "ALL":
      return t("ruleEditor.capability.mode.all");
    case "OR":
    case "ANY":
      return t("ruleEditor.capability.mode.any");
    case "ACCRUE":
      return t("ruleEditor.capability.mode.accrue");
    case "AT_LEAST":
      return t("ruleEditor.capability.mode.atLeast");
    case "WEIGHTED":
      return t("ruleEditor.capability.mode.weighted");
    default:
      return mode;
  }
}

function relationLabel(relation: string) {
  switch (relation) {
    case "NONE":
      return t("ruleEditor.capability.relation.none");
    case "NEAR":
      return t("ruleEditor.capability.relation.near");
    case "SENTENCE":
      return t("ruleEditor.capability.relation.sentence");
    case "PARAGRAPH":
      return t("ruleEditor.capability.relation.paragraph");
    default:
      return relation;
  }
}

function fieldLabel(field: string) {
  switch (field) {
    case "TITLE":
      return t("ruleEditor.capability.field.title");
    case "CONTENT":
      return t("ruleEditor.capability.field.content");
    case "COLUMN":
      return t("ruleEditor.capability.field.column");
    default:
      return field;
  }
}

export function CapabilityIndicatorBar({
  capability,
  showCollapseToggle = true,
  showHeading = true,
}: {
  capability: UiCapabilityViewModel;
  showCollapseToggle?: boolean;
  showHeading?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const boolLabel = (value: boolean | undefined) =>
    value ? t("ruleEditor.capability.status.enabled") : t("ruleEditor.capability.status.disabled");
  const listLabel = (value: string[], mapper: (item: string) => string) => {
    if (value.length === 0) return t("ruleEditor.capability.none");
    return value.map((item) => mapper(item)).join(" / ");
  };
  const relationListLabel = (value: string[]) => {
    if (value.length === 0) return t("ruleEditor.capability.none");
    const normalized = value.some((item) => item !== "NONE")
      ? value.filter((item) => item !== "NONE")
      : value;
    return normalized.map((item) => relationLabel(item)).join(" / ");
  };

  const disabledToken = t("ruleEditor.capability.status.disabled");

  const boolItem = (label: string, value: boolean | undefined) => ({
    text: `${label}：${boolLabel(value)}`,
  });

  const textItem = (text: string) => ({
    text,
  });

  const sections = [
    {
      title: t("ruleEditor.capability.section.semantic"),
      items: [
        textItem(`${t("ruleEditor.capability.semantic.mode")}：${listLabel(capability.semantic.allowModes, modeLabel)}`),
        boolItem(t("ruleEditor.capability.semantic.threshold"), capability.semantic.allowThreshold),
        boolItem(t("ruleEditor.capability.semantic.weighted"), capability.semantic.allowWeighted),
      ],
    },
    {
      title: t("ruleEditor.capability.section.structure"),
      items: [
        textItem(`${t("ruleEditor.capability.structure.relation")}：${relationListLabel(capability.structure.allowRelation)}`),
        boolItem(t("ruleEditor.capability.structure.order"), capability.structure.allowOrder),
        boolItem(t("ruleEditor.capability.structure.distance"), capability.structure.allowDistance),
      ],
    },
    {
      title: t("ruleEditor.capability.section.scope"),
      items: [textItem(`${t("ruleEditor.capability.scope.fields")}：${listLabel(capability.where.allowFields, fieldLabel)}`)],
    },
    {
      title: t("ruleEditor.capability.section.advanced"),
      items: [
        boolItem(t("ruleEditor.capability.advanced.not"), capability.advanced.allowNot),
        boolItem(t("ruleEditor.capability.advanced.excludeGroup"), capability.advanced.allowExcludeGroup),
        boolItem(t("ruleEditor.capability.advanced.topicRef"), capability.advanced.allowTopicRef),
      ],
    },
  ];

  return (
    <div className="rounded-lg border bg-white p-4">
      {showHeading ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">{t("ruleEditor.capability.title")}</div>
            {showCollapseToggle ? (
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => setCollapsed((prev) => !prev)}
                aria-expanded={!collapsed}
                aria-label={
                  collapsed
                    ? t("ruleEditor.capability.expandAria")
                    : t("ruleEditor.capability.collapseAria")
                }
              >
                {collapsed ? t("ruleEditor.capability.expand") : t("ruleEditor.capability.collapse")}
              </button>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-slate-500">{t("ruleEditor.capability.hint")}</div>
        </>
      ) : null}
      {!collapsed && (
        <div className={`${showHeading ? "mt-3" : ""} grid gap-3 md:grid-cols-2`}>
          {sections.map((section) => (
            <div key={section.title} className="rounded-md border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-900">{section.title}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {section.items.map((item) => (
                  <span
                    key={item.text}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      item.text.includes(disabledToken)
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
