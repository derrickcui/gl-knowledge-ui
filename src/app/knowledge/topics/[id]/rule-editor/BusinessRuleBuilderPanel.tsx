import { useEffect, useMemo, useState } from "react";
import type { UiCapabilityViewModel, UiExpressionNode, UiTermExpression } from "./types";
import {
  applyBuilder,
  createEmptyBlock,
  parseBuilder,
  reorderBlocks,
  updateBlock,
  type BuilderMode,
  type ConditionBlock,
} from "./builder-model";

export interface BuilderSelection {
  mode: BuilderMode;
  block: ConditionBlock | null;
}

export function BusinessRuleBuilderPanel({
  root,
  capability,
  readOnly,
  onChangeRoot,
  onSelectionChange,
  onRequestEditTerms,
}: {
  root: UiExpressionNode | null;
  capability: UiCapabilityViewModel;
  readOnly: boolean;
  onChangeRoot: (next: UiExpressionNode) => void;
  onSelectionChange?: (selection: BuilderSelection) => void;
  onRequestEditTerms?: (payload: { blockId: string; terms: UiTermExpression[] }) => void;
}) {
  const view = useMemo(() => parseBuilder(root), [root]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);

  const allowedModes = availableModes(capability);
  const canAddGroup = capability.semantic.allowNested;

  useEffect(() => {
    if (!view.blocks.length) {
      setSelectedBlockId(null);
      onSelectionChange?.({ mode: view.mode, block: null });
      return;
    }
    const exists = selectedBlockId && view.blocks.some((block) => block.id === selectedBlockId);
    const nextId = exists ? selectedBlockId : view.blocks[0].id;
    setSelectedBlockId(nextId);
    onSelectionChange?.({
      mode: view.mode,
      block: view.blocks.find((block) => block.id === nextId) ?? null,
    });
  }, [view, selectedBlockId, onSelectionChange]);

  const apply = (nextMode: BuilderMode, nextBlocks: ConditionBlock[]) => {
    onChangeRoot(applyBuilder(nextMode, view.structure, nextBlocks));
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">规则构建区</div>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-slate-700">第四层：条件块</div>
        <div className="text-xs text-slate-500">成立条件</div>
        {allowedModes.length > 1 ? (
          <div className="space-y-1 text-sm">
            {allowedModes.includes("ANY") && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={view.mode === "ANY"}
                  onChange={() => apply("ANY", view.blocks)}
                  disabled={readOnly}
                />
                任一情况满足
              </label>
            )}
            {allowedModes.includes("ALL") && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={view.mode === "ALL"}
                  onChange={() => apply("ALL", view.blocks)}
                  disabled={readOnly}
                />
                必须全部满足
              </label>
            )}
            {allowedModes.includes("ACCRUE") && (
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={view.mode === "ACCRUE"}
                  onChange={() => apply("ACCRUE", view.blocks)}
                  disabled={readOnly}
                />
                满足越多越容易成立
              </label>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-700">{modeToLabel(view.mode)}</div>
        )}
      </div>

      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
            onClick={() => apply(view.mode, [...view.blocks, createEmptyBlock()])}
          >
            + 添加条件
          </button>
          {canAddGroup && (
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
              onClick={() => apply(view.mode, [...view.blocks, { ...createEmptyBlock(), matchMode: "ALL" }])}
            >
              + 添加条件组
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {view.blocks.map((block, index) => {
          const selected = selectedBlockId === block.id;
          return (
            <div
              key={block.id}
              className={`rounded-md border p-3 ${selected ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50"}`}
              onClick={() => setSelectedBlockId(block.id)}
              draggable={!readOnly}
              onDragStart={() => setDraggingBlockId(block.id)}
              onDragOver={(event) => {
                if (!readOnly) event.preventDefault();
              }}
              onDrop={() => {
                if (readOnly || !draggingBlockId || draggingBlockId === block.id) return;
                apply(view.mode, reorderBlocks(view.blocks, draggingBlockId, block.id));
                setDraggingBlockId(null);
              }}
              onDragEnd={() => setDraggingBlockId(null)}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">条件块 {index + 1}</div>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border bg-white px-2 py-1 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestEditTerms?.({ blockId: block.id, terms: block.terms });
                      }}
                    >
                      添加术语
                    </button>
                    <button
                      type="button"
                      className="rounded border bg-white px-2 py-1 text-xs text-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        apply(view.mode, view.blocks.filter((item) => item.id !== block.id));
                      }}
                    >
                      删除
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-600">
                {block.terms.length > 1 && (
                  <div className="mb-2 rounded border bg-white px-2 py-1.5">
                    <div className="mb-1 text-[11px] text-slate-500">术语逻辑</div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={block.matchMode === "ANY"}
                          onChange={(event) => {
                            event.stopPropagation();
                            apply(view.mode, updateBlock(view.blocks, block.id, { matchMode: "ANY" }));
                          }}
                          disabled={readOnly}
                        />
                        任一匹配
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="radio"
                          checked={block.matchMode === "ALL"}
                          onChange={(event) => {
                            event.stopPropagation();
                            apply(view.mode, updateBlock(view.blocks, block.id, { matchMode: "ALL" }));
                          }}
                          disabled={readOnly}
                        />
                        全部匹配
                      </label>
                    </div>
                  </div>
                )}
                词语：{block.terms.length ? block.terms.map((item) => item.conceptName).join("、") : "未选择"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function availableModes(capability: UiCapabilityViewModel): BuilderMode[] {
  const set = new Set<BuilderMode>();
  capability.semantic.allowModes.forEach((mode) => {
    if (mode === "OR" || mode === "ANY") set.add("ANY");
    if (mode === "AND" || mode === "ALL") set.add("ALL");
    if (mode === "ACCRUE") set.add("ACCRUE");
  });
  if (set.size === 0) set.add("ANY");
  return Array.from(set);
}

function modeToLabel(mode: BuilderMode) {
  if (mode === "ALL") return "必须全部满足";
  if (mode === "ACCRUE") return "满足越多越容易成立";
  return "任一情况满足";
}
