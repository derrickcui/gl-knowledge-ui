"use client";

import {
  OPERATOR_PALETTE,
  PaletteItem,
  BusinessOperatorId,
} from "./paletteDefinition";
import { RuleNode } from "../rule-builder/astTypes";
import { isOperatorEnabled } from "../rule-builder/operatorGuards";
import type { RuleTemplateCapability } from "../rule-builder/templateCapabilities";
import { t } from "@/i18n";

interface Props {
  onSelect: (item: PaletteItem) => void;
  activeNode: RuleNode;
  disabled?: boolean;
  templateCapabilities?: RuleTemplateCapability | null;
  selectedId?: string | null;
  mode?: string;
  featureFlags?: Record<string, boolean> | null;
  onAddScenario?: () => void;
}

export default function OperatorPalette({
  onSelect,
  activeNode,
  disabled = false,
  templateCapabilities,
}: Props) {
  const hasTemplate = !!templateCapabilities;
  const allowTopicAsCondition =
    templateCapabilities?.allowTopicAsCondition !== false;
  const allowLocationTitle =
    templateCapabilities?.allowLocationTitle !== false;
  const allowLocationParagraph =
    templateCapabilities?.allowLocationParagraph !== false;
  const allowLocationSentence =
    templateCapabilities?.allowLocationSentence !== false;
  const allowAll = hasTemplate
    ? templateCapabilities?.allowAll === true
    : true;
  const allowAny = hasTemplate
    ? templateCapabilities?.allowAny === true
    : true;

  const baseItems = OPERATOR_PALETTE.flatMap((group) =>
    group.items.filter(
      (item) => item.id === "what.concept" || item.id === "what.topicRef"
    )
  );
  const filteredItems = baseItems.filter((item) => {
    if (item.id === "what.topicRef" && !allowTopicAsCondition) return false;
    if (item.id === "where.title" && !allowLocationTitle) return false;
    if (item.id === "where.paragraph" && !allowLocationParagraph) return false;
    if (item.id === "where.sentence" && !allowLocationSentence) return false;
    if (item.id === "how.all" && !allowAll) return false;
    if (item.id === "how.any" && !allowAny) return false;
    return true;
  });

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
            {filteredItems.map((item) => {
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
