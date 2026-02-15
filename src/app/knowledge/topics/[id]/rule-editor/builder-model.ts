import type { RuleField, UiExpressionNode, UiTermExpression } from "./types";
import { buildRootFromBlocks } from "./UiRuleNormalizer";
import { createId } from "./utils";

export type BuilderMode = "ANY" | "ALL" | "ACCRUE";
export type BlockRelation = "NONE" | "NEAR" | "SENTENCE" | "PARAGRAPH" | "ORDER";

export interface BuilderStructure {
  field: RuleField;
  relation: BlockRelation;
  ordered: boolean;
  distance: number;
}

export interface ConditionBlock {
  id: string;
  terms: UiTermExpression[];
  matchMode: "ANY" | "ALL";
}

export function createDefaultStructure(): BuilderStructure {
  return {
    field: "CONTENT",
    relation: "NONE",
    ordered: false,
    distance: 3,
  };
}

export function createEmptyBlock(): ConditionBlock {
  return {
    id: createId(),
    terms: [],
    matchMode: "ANY",
  };
}

export function parseBuilder(root: UiExpressionNode | null): {
  mode: BuilderMode;
  structure: BuilderStructure;
  blocks: ConditionBlock[];
} {
  const structure = createDefaultStructure();
  if (!root) return { mode: "ANY", structure, blocks: [] };

  const unwrapped = unwrapGlobalStructure(root, structure);
  if (!unwrapped) return { mode: "ANY", structure, blocks: [] };

  if (unwrapped.type === "LOGIC") {
    const mode = toMode(unwrapped.operator);

    // Legacy fallback: old data may have field/relation wrapped per child block.
    const extracted = unwrapped.children.map((child) => extractLegacyBlock(child));
    const inferred = inferCommonStructure(extracted.map((item) => item.structure));
    if (inferred) {
      structure.field = inferred.field;
      structure.relation = inferred.relation;
      structure.ordered = inferred.ordered;
      structure.distance = inferred.distance;
    }

    return {
      mode,
      structure,
      blocks: extracted.map((item) => item.block),
    };
  }

  return {
    mode: "ANY",
    structure,
    blocks: [parseBlock(unwrapped)],
  };
}

export function applyBuilder(mode: BuilderMode, structure: BuilderStructure, blocks: ConditionBlock[]) {
  return buildRootFromBlocks(mode, structure, blocks);
}

export function updateBlock(blocks: ConditionBlock[], blockId: string, patch: Partial<ConditionBlock>) {
  return blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block));
}

export function reorderBlocks(blocks: ConditionBlock[], sourceId: string, targetId: string): ConditionBlock[] {
  const sourceIndex = blocks.findIndex((block) => block.id === sourceId);
  const targetIndex = blocks.findIndex((block) => block.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return blocks;
  const next = [...blocks];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function unwrapGlobalStructure(node: UiExpressionNode, structure: BuilderStructure): UiExpressionNode | null {
  let current: UiExpressionNode | null = node;

  if (current.type === "FIELD") {
    structure.field = current.field;
    current = current.child;
  }

  if (!current) return null;

  if (current.type === "STRUCTURE") {
    structure.relation = current.scope === "SENTENCE" ? "SENTENCE" : "PARAGRAPH";
    current = current.child;
  }

  if (!current) return null;

  if (current.type === "POSITION_RELATION") {
    structure.relation = current.mode === "ORDER" ? "ORDER" : "NEAR";
    structure.ordered = current.mode === "PROXIMITY" ? Boolean(current.ordered) : true;
    structure.distance = current.mode === "PROXIMITY" ? current.distance ?? structure.distance : structure.distance;
    current = {
      id: current.id,
      type: "LOGIC",
      operator: "ANY",
      children: current.children,
    };
  }

  if (current.type === "PROXIMITY") {
    structure.relation = current.relation === "ORDER" ? "ORDER" : current.relation;
    structure.ordered = current.relation === "ORDER" ? true : current.ordered;
    structure.distance = current.relation === "NEAR" ? current.distance ?? structure.distance : structure.distance;

    if (current.children.length === 1) {
      current = current.children[0] ?? null;
    } else {
      current = {
        id: current.id,
        type: "LOGIC",
        operator: "ANY",
        children: current.children,
      };
    }
  }

  return current;
}

function extractLegacyBlock(node: UiExpressionNode): { block: ConditionBlock; structure: BuilderStructure } {
  const structure = createDefaultStructure();
  let current = node;

  if (current.type === "FIELD" && current.child) {
    structure.field = current.field;
    current = current.child;
  }

  if (current.type === "STRUCTURE" && current.child) {
    structure.relation = current.scope === "SENTENCE" ? "SENTENCE" : "PARAGRAPH";
    current = current.child;
  }

  if (current.type === "POSITION_RELATION") {
    structure.relation = current.mode === "ORDER" ? "ORDER" : "NEAR";
    structure.ordered = current.mode === "PROXIMITY" ? Boolean(current.ordered) : true;
    structure.distance = current.mode === "PROXIMITY" ? current.distance ?? structure.distance : structure.distance;
  }

  if (current.type === "PROXIMITY") {
    structure.relation = current.relation === "ORDER" ? "ORDER" : current.relation;
    structure.ordered = current.relation === "ORDER" ? true : current.ordered;
    structure.distance = current.relation === "NEAR" ? current.distance ?? structure.distance : structure.distance;
  }

  return {
    block: parseBlock(current),
    structure,
  };
}

function inferCommonStructure(items: BuilderStructure[]): BuilderStructure | null {
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  const allSame = rest.every(
    (item) =>
      item.field === first.field &&
      item.relation === first.relation &&
      item.ordered === first.ordered &&
      item.distance === first.distance
  );
  return allSame ? first : null;
}

function parseBlock(node: UiExpressionNode): ConditionBlock {
  if (node.type === "TERM_SET") {
    return {
      id: node.id,
      terms: node.terms,
      matchMode: node.matchMode,
    };
  }

  if (node.type === "LOGIC") {
    return {
      id: node.id,
      terms: node.children.flatMap((child) => gatherTerms(child)),
      matchMode: node.operator === "AND" || node.operator === "ALL" ? "ALL" : "ANY",
    };
  }

  return {
    id: node.id,
    terms: gatherTerms(node),
    matchMode: "ANY",
  };
}

function gatherTerms(node: UiExpressionNode): UiTermExpression[] {
  if (node.type === "TERM_SET") return node.terms;
  if (node.type === "LOGIC" || node.type === "POSITION_RELATION" || node.type === "PROXIMITY") {
    return node.children.flatMap((child) => gatherTerms(child));
  }
  if (node.type === "FIELD" || node.type === "STRUCTURE" || node.type === "NOT" || node.type === "SCORE") {
    return node.child ? gatherTerms(node.child) : [];
  }
  return [];
}

function toMode(operator: "AND" | "OR" | "ACCRUE" | "ALL" | "ANY" | "AT_LEAST" | "LOGSUM" | "WEIGHTED"): BuilderMode {
  if (operator === "AND" || operator === "ALL") return "ALL";
  if (operator === "ACCRUE" || operator === "AT_LEAST" || operator === "LOGSUM" || operator === "WEIGHTED") {
    return "ACCRUE";
  }
  return "ANY";
}

