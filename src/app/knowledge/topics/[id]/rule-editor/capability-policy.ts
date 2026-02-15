import type { LogicOperator, RuleField, StructureScope, UiCapabilityViewModel } from "./types";

export function canUsePositionMode(
  capability: UiCapabilityViewModel,
  mode: "PROXIMITY" | "ORDER"
): boolean {
  if (mode === "ORDER") {
    return capability.structure.allowRelation.includes("ORDER") || capability.structure.allowOrder;
  }
  return (
    capability.structure.allowRelation.includes("NEAR") ||
    capability.structure.allowRelation.includes("SENTENCE") ||
    capability.structure.allowRelation.includes("PARAGRAPH") ||
    capability.structure.allowDistance
  );
}

export function canUsePositionRelation(capability: UiCapabilityViewModel): boolean {
  return canUsePositionMode(capability, "PROXIMITY") || canUsePositionMode(capability, "ORDER");
}

export function structureScopeOptions(capability: UiCapabilityViewModel): StructureScope[] {
  const options: StructureScope[] = [];
  if (capability.structure.allowRelation.includes("NONE")) options.push("DOCUMENT");
  if (capability.structure.allowRelation.includes("SENTENCE")) options.push("SENTENCE");
  if (capability.structure.allowRelation.includes("PARAGRAPH")) options.push("PARAGRAPH");
  if (options.length === 0) options.push("DOCUMENT");
  return options;
}

export function structureScopeOptionsForField(
  capability: UiCapabilityViewModel,
  field: RuleField
): StructureScope[] {
  if (field === "TITLE" || field === "COLUMN") {
    return ["DOCUMENT"];
  }
  return structureScopeOptions(capability);
}

export function canUseLogicOperator(capability: UiCapabilityViewModel, operator: LogicOperator): boolean {
  if (operator === "AND" || operator === "ALL") {
    return capability.semantic.allowModes.some((mode) => mode === "AND" || mode === "ALL");
  }
  if (operator === "OR" || operator === "ANY") {
    return capability.semantic.allowModes.some((mode) => mode === "OR" || mode === "ANY");
  }
  if (operator === "AT_LEAST") {
    return capability.semantic.allowModes.includes("AT_LEAST") || capability.semantic.allowThreshold;
  }
  if (operator === "LOGSUM" || operator === "WEIGHTED") {
    return (
      capability.semantic.allowModes.some((mode) => mode === "LOGSUM" || mode === "WEIGHTED") ||
      capability.semantic.allowWeighted
    );
  }
  if (operator === "ACCRUE") {
    return capability.semantic.allowModes.includes("ACCRUE");
  }
  return false;
}

export function canUseNot(capability: UiCapabilityViewModel): boolean {
  return Boolean(capability.advanced.allowNot);
}

export function canUseExcludeGroup(capability: UiCapabilityViewModel): boolean {
  return capability.advanced.allowExcludeGroup;
}

export function canUseTopicRef(capability: UiCapabilityViewModel): boolean {
  return capability.advanced.allowTopicRef;
}

export function canUseWeighted(capability: UiCapabilityViewModel): boolean {
  return capability.semantic.allowWeighted;
}

export function canUseThreshold(capability: UiCapabilityViewModel): boolean {
  return capability.semantic.allowThreshold;
}
