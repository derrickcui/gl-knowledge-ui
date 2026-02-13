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
  }));
}

export function buildRootFromBlocks(
  mode: BuilderMode,
  structure: BuilderStructure,
  blocks: ConditionBlock[]
): UiExpressionNode {
  const logic: UiLogicNode = {
    id: createId(),
    type: "LOGIC",
    operator: mode === "ALL" ? "ALL" : mode === "ACCRUE" ? "ACCRUE" : "ANY",
    children: blocks.map((block) => buildBlockNode(block)),
  };

  let root: UiExpressionNode = logic;

  if (structure.relation !== "NONE") {
    root = {
      id: createId(),
      type: "PROXIMITY",
      relation: structure.relation,
      ordered: structure.ordered,
      distance: structure.distance,
      children: [root],
    };
  }

  if (structure.field !== "CONTENT") {
    root = {
      id: createId(),
      type: "FIELD",
      field: structure.field,
      child: root,
    };
  }

  return root;
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

