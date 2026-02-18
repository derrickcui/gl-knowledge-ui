import { t } from "@/i18n";
import type { UiExpressionNode, UiNodeType } from "./types";

export function AddNodeButtons({
  parentType,
  parentId,
  allowedChildren,
  onAdd,
  hiddenTypes = [],
  disabledTypes = [],
}: {
  parentType: UiExpressionNode["type"];
  parentId: string;
  allowedChildren: UiNodeType[];
  onAdd: (parentId: string, type: UiNodeType) => void;
  hiddenTypes?: UiNodeType[];
  disabledTypes?: UiNodeType[];
}) {
  void parentType;
  const visible = allowedChildren.filter((type) => !hiddenTypes.includes(type));
  const isDisabled = (type: UiNodeType) => disabledTypes.includes(type);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.includes("TERM_SET") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "TERM_SET")}
          disabled={isDisabled("TERM_SET")}
        >
          + {t("ruleEditor.tree.add.termSet")}
        </button>
      )}

      {visible.includes("LOGIC") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "LOGIC")}
          disabled={isDisabled("LOGIC")}
        >
          + {t("ruleEditor.tree.add.logic")}
        </button>
      )}

      {visible.includes("FIELD") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "FIELD")}
          disabled={isDisabled("FIELD")}
        >
          + {t("ruleEditor.tree.add.field")}
        </button>
      )}

      {visible.includes("POSITION_RELATION") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "POSITION_RELATION")}
          disabled={isDisabled("POSITION_RELATION")}
        >
          + {t("ruleEditor.tree.add.positionRelation")}
        </button>
      )}

      {visible.includes("STRUCTURE") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "STRUCTURE")}
          disabled={isDisabled("STRUCTURE")}
        >
          + {t("ruleEditor.tree.add.structure")}
        </button>
      )}

      {visible.includes("NOT") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "NOT")}
          disabled={isDisabled("NOT")}
        >
          + {t("ruleEditor.tree.add.not")}
        </button>
      )}

      {visible.includes("SCORE") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "SCORE")}
          disabled={isDisabled("SCORE")}
        >
          + {t("ruleEditor.tree.add.score")}
        </button>
      )}

      {visible.includes("TOPIC_REF") && (
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
          onClick={() => onAdd(parentId, "TOPIC_REF")}
          disabled={isDisabled("TOPIC_REF")}
        >
          + {t("ruleEditor.tree.add.topicRef")}
        </button>
      )}
    </>
  );
}
