"use client";

import { OPERATOR_PALETTE, PaletteItem } from "./paletteDefinition";
import { RuleNode } from "../rule-builder/astTypes";
import { isOperatorEnabled } from "../rule-builder/operatorGuards";

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
  return (
    <aside className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">业务条件入口</div>
      <div className="mt-3 space-y-4 text-sm">
        {OPERATOR_PALETTE.map((group) => (
          <details
            key={group.title}
            className="group rounded-md border border-dashed px-2 py-2"
            open={group.defaultOpen}
          >
            <summary className="cursor-pointer select-none text-sm font-medium text-muted-foreground">
              {group.title}
            </summary>
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => {
                const guard = isOperatorEnabled(item.id, activeNode);
                const isDisabled = disabled || !guard.enabled;
                const title = disabled
                  ? "规则正在评审中，当前不可修改"
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
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  );
}
