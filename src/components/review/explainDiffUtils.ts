import { ExplainDiffItem } from "./explainDiffTypes";

export function diffStyleForBlock(
  diff: ExplainDiffItem[] | undefined,
  blockIndex: number,
  side: "before" | "after"
): string {
  if (!diff) return "";
  const hit = diff.find((item) => item.blockIndex === blockIndex);
  if (!hit) return "";

  switch (hit.kind) {
    case "ADD":
      return side === "after"
        ? "border-green-400 bg-green-50"
        : "opacity-40";
    case "REMOVE":
      return side === "before"
        ? "border-red-400 bg-red-50"
        : "opacity-40";
    case "MODIFY":
      return "border-amber-400 bg-amber-50";
    default:
      return "";
  }
}
