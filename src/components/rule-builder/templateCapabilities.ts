export type RuleTemplateCapability = {
  // Scenario operators
  allowAll?: boolean;
  allowAny?: boolean;
  allowAccrue?: boolean;
  allowLogsum?: boolean;

  // Threshold input for LOGSUM
  allowThreshold?: boolean;

  // Condition importance
  allowImportance?: boolean;

  // Condition locations
  allowLocationTitle?: boolean;
  allowLocationParagraph?: boolean;
  allowLocationSentence?: boolean;

  // Proximity
  allowNear?: boolean;
  allowOrder?: boolean;

  // Topic references
  allowTopicAsCondition?: boolean;
  allowTopicAsScenario?: boolean;

  // Negation
  allowNegate?: boolean;
};

type LegacyAllowedModes = {
  all?: boolean;
  partial?: boolean;
  weighted?: boolean;
};

type LegacyPositionRules = {
  any?: boolean;
  paragraph?: boolean;
  sentence?: boolean;
  order?: boolean;
  near?: boolean;
};

const hasOwn = (obj: any, key: string) =>
  !!obj && Object.prototype.hasOwnProperty.call(obj, key);

export function extractRuleTemplateCapability(
  raw: any
): RuleTemplateCapability | null {
  if (!raw) return null;
  const normalized = raw?.config ?? raw?.data ?? raw;

  const caps: RuleTemplateCapability = {};

  if (hasOwn(normalized, "allowAll")) {
    caps.allowAll = !!normalized.allowAll;
  }
  if (hasOwn(normalized, "allowAny")) {
    caps.allowAny = !!normalized.allowAny;
  }
  if (hasOwn(normalized, "allowAccrue")) {
    caps.allowAccrue = !!normalized.allowAccrue;
  }
  if (hasOwn(normalized, "allowLogsum")) {
    caps.allowLogsum = !!normalized.allowLogsum;
  }
  if (hasOwn(normalized, "allowThreshold")) {
    caps.allowThreshold = !!normalized.allowThreshold;
  }
  if (hasOwn(normalized, "allowImportance")) {
    caps.allowImportance = !!normalized.allowImportance;
  }
  if (hasOwn(normalized, "allowLocationTitle")) {
    caps.allowLocationTitle = !!normalized.allowLocationTitle;
  }
  if (hasOwn(normalized, "allowLocationParagraph")) {
    caps.allowLocationParagraph = !!normalized.allowLocationParagraph;
  }
  if (hasOwn(normalized, "allowLocationSentence")) {
    caps.allowLocationSentence = !!normalized.allowLocationSentence;
  }
  if (hasOwn(normalized, "allowNear")) {
    caps.allowNear = !!normalized.allowNear;
  }
  if (hasOwn(normalized, "allowOrder")) {
    caps.allowOrder = !!normalized.allowOrder;
  }
  if (hasOwn(normalized, "allowTopicAsCondition")) {
    caps.allowTopicAsCondition = !!normalized.allowTopicAsCondition;
  }
  if (hasOwn(normalized, "allowTopicAsScenario")) {
    caps.allowTopicAsScenario = !!normalized.allowTopicAsScenario;
  }
  if (hasOwn(normalized, "allowNegate")) {
    caps.allowNegate = !!normalized.allowNegate;
  }

  const allowedModes: LegacyAllowedModes | null =
    normalized.allowedModes ?? normalized.allowed_modes ?? null;
  const importanceAllowed =
    normalized.importanceAllowed ??
    normalized.importance_allowed ??
    undefined;
  const positionRules: LegacyPositionRules | null =
    normalized.positionRules ?? normalized.position_rules ?? null;

  if (allowedModes && typeof allowedModes === "object") {
    if (!hasOwn(caps, "allowAll") && hasOwn(allowedModes, "all")) {
      caps.allowAll = !!allowedModes.all;
    }
    if (!hasOwn(caps, "allowAny") && hasOwn(allowedModes, "all")) {
      caps.allowAny = !!allowedModes.all;
    }
    if (!hasOwn(caps, "allowLogsum")) {
      const partial = !!allowedModes.partial;
      const weighted = !!allowedModes.weighted;
      caps.allowLogsum = partial || weighted;
    }
  }

  if (
    importanceAllowed !== undefined &&
    !hasOwn(caps, "allowImportance")
  ) {
    caps.allowImportance = !!importanceAllowed;
  }

  if (positionRules && typeof positionRules === "object") {
    if (
      !hasOwn(caps, "allowLocationParagraph") &&
      hasOwn(positionRules, "paragraph")
    ) {
      caps.allowLocationParagraph = !!positionRules.paragraph;
    }
    if (
      !hasOwn(caps, "allowLocationSentence") &&
      hasOwn(positionRules, "sentence")
    ) {
      caps.allowLocationSentence = !!positionRules.sentence;
    }
    if (!hasOwn(caps, "allowNear") && hasOwn(positionRules, "near")) {
      caps.allowNear = !!positionRules.near;
    }
    if (!hasOwn(caps, "allowOrder") && hasOwn(positionRules, "order")) {
      caps.allowOrder = !!positionRules.order;
    }
  }

  return Object.keys(caps).length ? caps : null;
}
