"use client";

import {
  OPERATOR_PALETTE,
  PaletteItem,
  BusinessOperatorId,
} from "./paletteDefinition";
import { RuleNode } from "../rule-builder/astTypes";
import { isOperatorEnabled } from "../rule-builder/operatorGuards";
import { t } from "@/i18n";

interface Props {
  onSelect: (item: PaletteItem) => void;
  activeNode: RuleNode;
  disabled?: boolean;
}

export default function OperatorPalette({
  onSelect,
  activeNode,
  disabled = false,
}: Props) {
  const baseItems = OPERATOR_PALETTE.flatMap((group) =>
    group.items.filter(
      (item) => item.id === "what.concept" || item.id === "what.topicRef"
    )
  );

  const operatorText: Record<
    BusinessOperatorId,
    { titleKey: Parameters<typeof t>[0]; descKey?: Parameters<typeof t>[0] }
  > = {
    "what.concept": {
      titleKey: "operator.what.concept.title",
      descKey: "operator.what.concept.desc",
    },
    "what.topicRef": {
      titleKey: "operator.what.topicRef.title",
      descKey: "operator.what.topicRef.desc",
    },
    "where.body": { titleKey: "operator.where.body.title" },
    "where.title": { titleKey: "operator.where.title.title" },
    "where.paragraph": { titleKey: "operator.where.paragraph.title" },
    "where.sentence": { titleKey: "operator.where.sentence.title" },
    "how.all": { titleKey: "operator.how.all.title" },
    "how.any": { titleKey: "operator.how.any.title" },
    "how.exclude": { titleKey: "operator.how.exclude.title" },
  };

  const getOperatorTitle = (item: PaletteItem) => {
    const entry = operatorText[item.id];
    return entry?.titleKey ? t(entry.titleKey) : item.title;
  };

  const getOperatorDesc = (item: PaletteItem) => {
    const entry = operatorText[item.id];
    return entry?.descKey ? t(entry.descKey) : item.description;
  };

  return (
    <aside className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("palette.title")}</div>
      <div className="mt-3 space-y-4 text-sm">
        <details className="group rounded-md border border-dashed px-2 py-2" open>
          <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
            {t("palette.baseTitle")}
          </summary>
          <ul className="mt-2 space-y-1">
            {baseItems.map((item) => {
              const guard = isOperatorEnabled(item.id, activeNode);
              const isDisabled = disabled || !guard.enabled;
              const title = disabled
                ? t("palette.disabled.readOnly")
                : guard.reason;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    title={title}
                    className={`w-full rounded-md px-2 py-1 text-left ${
                      !isDisabled
                        ? "hover:bg-muted/40"
                        : "cursor-not-allowed opacity-40"
                    }`}
                    onClick={() => onSelect(item)}
                  >
                    <div className="text-sm text-foreground">
                      {getOperatorTitle(item)}
                    </div>
                    {getOperatorDesc(item) && (
                      <div className="text-xs text-muted-foreground">
                        {getOperatorDesc(item)}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>

      </div>
    </aside>
  );
}
