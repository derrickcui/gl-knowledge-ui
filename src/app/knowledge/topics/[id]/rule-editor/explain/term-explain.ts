import { t } from "@/i18n";
import type { UiTermSetNode } from "../types";
import type { ExplainNode } from "./types";

export function buildTermExplain(node: UiTermSetNode): ExplainNode | null {
  const names = node.terms.map((item) => item.conceptName).filter(Boolean);
  if (names.length === 0) return null;
  const joined = names.map((name) => `“${name}”`).join(t("ruleEditor.explain.termJoinOr"));
  return {
    type: "TERM",
    text: t("ruleEditor.explain.termContains", { terms: joined }),
    source: node,
    children: [],
  };
}
