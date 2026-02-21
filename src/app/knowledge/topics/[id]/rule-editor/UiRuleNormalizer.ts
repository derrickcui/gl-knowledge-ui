import { createId } from "./utils";
import type { UiExpressionNode, UiLogicNode, UiTermExpression } from "./types";
import type { SelectedTerm } from "./term-selector-types";
import type { BuilderMode, BuilderStructure, ConditionBlock } from "./builder-model";

export function selectedTermsToExpressions(terms: SelectedTerm[]): UiTermExpression[] {
  return terms.map((item) => ({
    source: "CONCEPT",
    conceptId: item.conceptId,
    conceptName: item.conceptName,
    includeDescendants: item.includeDescendants,
    weight: Number.isFinite(item.weight) && item.weight > 0 ? item.weight : 1,
  }));
}

export function buildRootFromBlocks(
  mode: BuilderMode,
  structure: BuilderStructure,
  blocks: ConditionBlock[]
): UiExpressionNode {
  let logic: UiLogicNode = {
    id: createId(),
    type: "LOGIC",
    operator: mode === "ALL" ? "ALL" : mode === "ACCRUE" ? "ACCRUE" : "ANY",
    children: blocks.map((block) => buildBlockNode(block)),
  };

  if (structure.relation === "NEAR" || structure.relation === "ORDER") {
    const termChildren = logic.children.filter(
      (child): child is Extract<UiExpressionNode, { type: "TERM_SET" }> => child.type === "TERM_SET"
    );
    logic = {
      ...logic,
      children: [
        {
          id: createId(),
          type: "POSITION_RELATION",
          mode: "PROXIMITY",
          relation: "NEAR",
          ordered: structure.relation === "ORDER" ? true : structure.ordered,
          strict: undefined,
          distance: structure.relation === "NEAR" ? structure.distance : undefined,
          children: termChildren,
        },
      ],
    };
  }

  let expression: UiExpressionNode = logic;

  if (structure.relation === "SENTENCE" || structure.relation === "PARAGRAPH") {
    expression = {
      id: createId(),
      type: "STRUCTURE",
      scope: structure.relation,
      child: expression,
    };
  }

  if (structure.field !== "CONTENT") {
    expression = {
      id: createId(),
      type: "FIELD",
      field: structure.field,
      child: expression,
    };
  }

  // Root is always an expression group in the new model.
  if (expression.type === "LOGIC") {
    return expression;
  }
  return {
    id: createId(),
    type: "LOGIC",
    operator: "AND",
    children: [expression],
  };
}

function buildBlockNode(block: ConditionBlock): UiExpressionNode {
  return {
    id: createId(),
    type: "TERM_SET",
    terms: dedupeTerms(block.terms),
    matchMode: block.matchMode,
  };
}

function dedupeTerms(terms: UiTermExpression[]) {
  const map = new Map<string, UiTermExpression>();
  terms.forEach((term) => map.set(term.conceptId, term));
  return Array.from(map.values());
}

