export type GroupOperator =
  | "AND"
  | "OR"
  | "ACCRUE"
  | "LOGSUM"
  | "WEIGHTED";

export type StructureRelation =
  | "NONE"
  | "NEAR"
  | "SENTENCE"
  | "PARAGRAPH";

export type RuleField =
  | "CONTENT"
  | "TITLE"
  | "COLUMN";

export interface TemplateCapabilityState {
  semantic: {
    allowModes: GroupOperator[];
    allowThreshold: boolean;
    allowWeighted: boolean;
  };
  structure: {
    allowRelation: StructureRelation[];
    allowOrder: boolean;
    allowDistance: boolean;
  };
  where: {
    allowFields: RuleField[];
  };
  advanced: {
    allowNot: boolean;
    allowExcludeGroup: boolean;
    allowTopicRef: boolean;
  };
}

export interface TemplateCreateRequest {
  name: string;
  description: string;
  category?: string;
  capability: TemplateCapabilityState;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeGroupOperator(value: unknown): GroupOperator | null {
  if (value === "AND") return "AND";
  if (value === "OR") return "OR";
  if (value === "ACCRUE") return "ACCRUE";
  if (value === "LOGSUM") return "LOGSUM";
  if (value === "WEIGHTED") return "WEIGHTED";
  // Backward compatibility for persisted legacy template capability.
  if (value === "AT_LEAST") return "LOGSUM";
  return null;
}

function isStructureRelation(value: unknown): value is StructureRelation {
  return (
    value === "NONE" ||
    value === "NEAR" ||
    value === "SENTENCE" ||
    value === "PARAGRAPH"
  );
}

function isRuleField(value: unknown): value is RuleField {
  return value === "TITLE" || value === "CONTENT" || value === "COLUMN";
}

export function parseTemplateCapabilityState(
  value: unknown
): TemplateCapabilityState | null {
  if (!isRecord(value)) return null;
  const semantic = value.semantic;
  const structure = value.structure;
  const where = value.where;
  const advanced = value.advanced;
  if (!isRecord(semantic) || !isRecord(structure) || !isRecord(where) || !isRecord(advanced)) {
    return null;
  }

  const allowModes = Array.isArray(semantic.allowModes)
    ? Array.from(
        new Set(
          semantic.allowModes
            .map((mode) => normalizeGroupOperator(mode))
            .filter((mode): mode is GroupOperator => Boolean(mode))
        )
      )
    : null;
  const allowRelation = Array.isArray(structure.allowRelation)
    ? structure.allowRelation.filter(isStructureRelation)
    : null;
  const allowFields = Array.isArray(where.allowFields)
    ? where.allowFields.filter(isRuleField)
    : null;

  if (!allowModes || !allowRelation || !allowFields) return null;
  if (typeof semantic.allowThreshold !== "boolean") return null;
  if (typeof semantic.allowWeighted !== "boolean") return null;
  if (typeof structure.allowOrder !== "boolean") return null;
  if (typeof structure.allowDistance !== "boolean") return null;
  if (typeof advanced.allowNot !== "boolean") return null;
  if (typeof advanced.allowExcludeGroup !== "boolean") return null;
  if (typeof advanced.allowTopicRef !== "boolean") return null;

  return {
    semantic: {
      allowModes,
      allowThreshold: semantic.allowThreshold,
      allowWeighted: semantic.allowWeighted,
    },
    structure: {
      allowRelation,
      allowOrder: structure.allowOrder,
      allowDistance: structure.allowDistance,
    },
    where: {
      allowFields,
    },
    advanced: {
      allowNot: advanced.allowNot,
      allowExcludeGroup: advanced.allowExcludeGroup,
      allowTopicRef: advanced.allowTopicRef,
    },
  };
}
