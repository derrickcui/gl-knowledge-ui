export type ExplainDiffKind = "ADD" | "REMOVE" | "MODIFY";

export interface ExplainDiffItem {
  kind: ExplainDiffKind;
  blockIndex: number;
}
