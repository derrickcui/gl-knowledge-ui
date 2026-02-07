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
  if (!hasOwn(caps, "allowAll") && hasOwn(normalized, "allow_all")) {
    caps.allowAll = !!normalized.allow_all;
  }
  if (hasOwn(normalized, "allowAny")) {
    caps.allowAny = !!normalized.allowAny;
  }
  if (hasOwn(normalized, "allowAccrue")) {
    caps.allowAccrue = !!normalized.allowAccrue;
  }
  if (
    !hasOwn(caps, "allowAccrue") &&
    hasOwn(normalized, "allow_accrue")
  ) {
    caps.allowAccrue = !!normalized.allow_accrue;
  }
  if (hasOwn(normalized, "allowLogsum")) {
    caps.allowLogsum = !!normalized.allowLogsum;
  }
  if (
    !hasOwn(caps, "allowLogsum") &&
    hasOwn(normalized, "allow_logsum")
  ) {
    caps.allowLogsum = !!normalized.allow_logsum;
  }
  if (hasOwn(normalized, "allowThreshold")) {
    caps.allowThreshold = !!normalized.allowThreshold;
  }
  if (hasOwn(normalized, "allowImportance")) {
    caps.allowImportance = !!normalized.allowImportance;
  }
  if (
    !hasOwn(caps, "allowImportance") &&
    hasOwn(normalized, "allow_importance")
  ) {
    caps.allowImportance = !!normalized.allow_importance;
  }
  if (hasOwn(normalized, "allowLocationTitle")) {
    caps.allowLocationTitle = !!normalized.allowLocationTitle;
  }
  if (hasOwn(normalized, "allowLocationParagraph")) {
    caps.allowLocationParagraph = !!normalized.allowLocationParagraph;
  }
  if (
    !hasOwn(caps, "allowLocationParagraph") &&
    hasOwn(normalized, "allow_paragraph")
  ) {
    caps.allowLocationParagraph = !!normalized.allow_paragraph;
  }
  if (hasOwn(normalized, "allowLocationSentence")) {
    caps.allowLocationSentence = !!normalized.allowLocationSentence;
  }
  if (
    !hasOwn(caps, "allowLocationSentence") &&
    hasOwn(normalized, "allow_sentence")
  ) {
    caps.allowLocationSentence = !!normalized.allow_sentence;
  }
  if (hasOwn(normalized, "allowNear")) {
    caps.allowNear = !!normalized.allowNear;
  }
  if (!hasOwn(caps, "allowNear") && hasOwn(normalized, "allowProximity")) {
    caps.allowNear = !!normalized.allowProximity;
  }
  if (!hasOwn(caps, "allowNear") && hasOwn(normalized, "allow_proximity")) {
    caps.allowNear = !!normalized.allow_proximity;
  }
  if (hasOwn(normalized, "allowOrder")) {
    caps.allowOrder = !!normalized.allowOrder;
  }
  if (!hasOwn(caps, "allowOrder") && hasOwn(normalized, "allow_order")) {
    caps.allowOrder = !!normalized.allow_order;
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

  const allowModes =
    normalized.allowModes ?? normalized.allow_modes ?? null;
  const allowedModes: LegacyAllowedModes | null =
    normalized.allowedModes ?? normalized.allowed_modes ?? null;
  const importanceAllowed =
    normalized.importance?.enabled ??
    normalized.importanceAllowed ??
    normalized.importance_allowed ??
    undefined;
  const positionRules: LegacyPositionRules | null =
    normalized.positionRules ?? normalized.position_rules ?? null;
  const proximity = normalized.proximity ?? null;

  if (allowModes && typeof allowModes === "object") {
    if (!hasOwn(caps, "allowAll") && hasOwn(allowModes, "ALL")) {
      caps.allowAll = !!allowModes.ALL;
    }
    if (!hasOwn(caps, "allowAny") && hasOwn(allowModes, "ALL")) {
      caps.allowAny = !!allowModes.ALL;
    }
    if (!hasOwn(caps, "allowAccrue") && hasOwn(allowModes, "ACCRUE")) {
      caps.allowAccrue = !!allowModes.ACCRUE;
    }
    if (!hasOwn(caps, "allowLogsum") && hasOwn(allowModes, "LOGSUM")) {
      caps.allowLogsum = !!allowModes.LOGSUM;
    }
  }

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

  if (proximity && typeof proximity === "object") {
    if (
      !hasOwn(caps, "allowLocationParagraph") &&
      hasOwn(proximity, "paragraph")
    ) {
      caps.allowLocationParagraph = !!proximity.paragraph;
    }
    if (
      !hasOwn(caps, "allowLocationSentence") &&
      hasOwn(proximity, "sentence")
    ) {
      caps.allowLocationSentence = !!proximity.sentence;
    }
    if (!hasOwn(caps, "allowNear") && hasOwn(proximity, "enabled")) {
      caps.allowNear = !!proximity.enabled;
    }
    if (!hasOwn(caps, "allowOrder") && hasOwn(proximity, "order")) {
      caps.allowOrder = !!proximity.order;
    }
  }

  if (caps.allowLogsum && !hasOwn(caps, "allowThreshold")) {
    caps.allowThreshold = true;
  }

  return Object.keys(caps).length ? caps : null;
}
