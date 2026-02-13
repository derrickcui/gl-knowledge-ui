"use client";

import type { ReactNode } from "react";

import { t } from "@/i18n";
import type {
  TemplateCapabilityState,
  GroupOperator,
  StructureRelation,
  RuleField,
} from "./capability-types";

type Props = {
  value: TemplateCapabilityState;
  disabled?: boolean;
  onChange: (next: TemplateCapabilityState) => void;
};

function toggleArrayItem<T extends string>(list: T[], item: T, checked: boolean): T[] {
  if (checked) {
    if (list.includes(item)) return list;
    return [...list, item];
  }
  return list.filter((it) => it !== item);
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border p-4">
      <div className="text-sm font-semibold">{title}</div>
      {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
      <div className="mt-3 text-sm">{children}</div>
    </section>
  );
}

function Checkbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={`flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function TemplateCapabilityEditor({
  value,
  disabled = false,
  onChange,
}: Props) {
  const setSemanticMode = (mode: GroupOperator, checked: boolean) => {
    onChange({
      ...value,
      semantic: {
        ...value.semantic,
        allowModes: toggleArrayItem(value.semantic.allowModes, mode, checked),
      },
    });
  };

  const setStructureRelation = (relation: StructureRelation, checked: boolean) => {
    onChange({
      ...value,
      structure: {
        ...value.structure,
        allowRelation: toggleArrayItem(value.structure.allowRelation, relation, checked),
      },
    });
  };

  const setWhereField = (field: RuleField, checked: boolean) => {
    onChange({
      ...value,
      where: {
        ...value.where,
        allowFields: toggleArrayItem(value.where.allowFields, field, checked),
      },
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section
        title={t("ruleEditor.capability.section.semantic")}
        description={t("templates.capabilityEditor.description.semantic")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            label={t("ruleEditor.capability.mode.all")}
            checked={value.semantic.allowModes.includes("AND")}
            disabled={disabled}
            onChange={(checked) => setSemanticMode("AND", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.mode.any")}
            checked={value.semantic.allowModes.includes("OR")}
            disabled={disabled}
            onChange={(checked) => setSemanticMode("OR", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.mode.atLeast")}
            checked={value.semantic.allowModes.includes("AT_LEAST")}
            disabled={disabled}
            onChange={(checked) => setSemanticMode("AT_LEAST", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.mode.accrue")}
            checked={value.semantic.allowModes.includes("ACCRUE")}
            disabled={disabled}
            onChange={(checked) => setSemanticMode("ACCRUE", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.mode.weighted")}
            checked={value.semantic.allowModes.includes("WEIGHTED")}
            disabled={disabled}
            onChange={(checked) => setSemanticMode("WEIGHTED", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.semantic.threshold")}
            checked={value.semantic.allowThreshold}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                semantic: { ...value.semantic, allowThreshold: checked },
              })
            }
          />
          <Checkbox
            label={t("ruleEditor.capability.semantic.weighted")}
            checked={value.semantic.allowWeighted}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                semantic: { ...value.semantic, allowWeighted: checked },
              })
            }
          />
        </div>
      </Section>

      <Section
        title={t("ruleEditor.capability.section.structure")}
        description={t("templates.capabilityEditor.description.structure")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            label={t("ruleEditor.capability.relation.none")}
            checked={value.structure.allowRelation.includes("NONE")}
            disabled={disabled}
            onChange={(checked) => setStructureRelation("NONE", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.relation.near")}
            checked={value.structure.allowRelation.includes("NEAR")}
            disabled={disabled}
            onChange={(checked) => setStructureRelation("NEAR", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.relation.sentence")}
            checked={value.structure.allowRelation.includes("SENTENCE")}
            disabled={disabled}
            onChange={(checked) => setStructureRelation("SENTENCE", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.relation.paragraph")}
            checked={value.structure.allowRelation.includes("PARAGRAPH")}
            disabled={disabled}
            onChange={(checked) => setStructureRelation("PARAGRAPH", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.structure.order")}
            checked={value.structure.allowOrder}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                structure: { ...value.structure, allowOrder: checked },
              })
            }
          />
          <Checkbox
            label={t("ruleEditor.capability.structure.distance")}
            checked={value.structure.allowDistance}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                structure: { ...value.structure, allowDistance: checked },
              })
            }
          />
        </div>
      </Section>

      <Section
        title={t("ruleEditor.capability.section.scope")}
        description={t("templates.capabilityEditor.description.scope")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            label={t("ruleEditor.capability.field.title")}
            checked={value.where.allowFields.includes("TITLE")}
            disabled={disabled}
            onChange={(checked) => setWhereField("TITLE", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.field.content")}
            checked={value.where.allowFields.includes("CONTENT")}
            disabled={disabled}
            onChange={(checked) => setWhereField("CONTENT", checked)}
          />
          <Checkbox
            label={t("ruleEditor.capability.field.column")}
            checked={value.where.allowFields.includes("COLUMN")}
            disabled={disabled}
            onChange={(checked) => setWhereField("COLUMN", checked)}
          />
        </div>
      </Section>

      <Section
        title={t("ruleEditor.capability.section.advanced")}
        description={t("templates.capabilityEditor.description.advanced")}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <Checkbox
            label={t("ruleEditor.capability.advanced.not")}
            checked={value.advanced.allowNot}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                advanced: { ...value.advanced, allowNot: checked },
              })
            }
          />
          <Checkbox
            label={t("ruleEditor.capability.advanced.excludeGroup")}
            checked={value.advanced.allowExcludeGroup}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                advanced: { ...value.advanced, allowExcludeGroup: checked },
              })
            }
          />
          <Checkbox
            label={t("ruleEditor.capability.advanced.topicRef")}
            checked={value.advanced.allowTopicRef}
            disabled={disabled}
            onChange={(checked) =>
              onChange({
                ...value,
                advanced: { ...value.advanced, allowTopicRef: checked },
              })
            }
          />
        </div>
      </Section>
    </div>
  );
}
