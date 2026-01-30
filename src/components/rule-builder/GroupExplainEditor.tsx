"use client";

import { useEffect, useState } from "react";
import { RuleNode } from "./astTypes";
import { generateGroupExplain } from "./explain/groupExplain";

interface Props {
  group: RuleNode;
  onChange: (next: RuleNode) => void;
  readOnly?: boolean;
}

export function GroupExplainEditor({
  group,
  onChange,
  readOnly = false,
}: Props) {
  const autoText = generateGroupExplain(group);
  const isCustom = group.explain?.mode === "CUSTOM";
  const initialText = isCustom
    ? group.explain?.text ?? autoText
    : autoText;
  const [draft, setDraft] = useState(initialText);

  useEffect(() => {
    setDraft(isCustom ? group.explain?.text ?? autoText : autoText);
  }, [group.explain?.text, autoText, isCustom]);

  function saveCustom() {
    if (readOnly) return;
    onChange({
      ...group,
      explain: {
        mode: "CUSTOM",
        text: draft,
      },
    });
  }

  function resetAuto() {
    if (readOnly) return;
    onChange({
      ...group,
      explain: {
        mode: "AUTO",
        text: autoText,
      },
    });
    setDraft(autoText);
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="text-xs text-slate-500 mb-1">
        {"\u5224\u65ad\u573a\u666f\u8bf4\u660e"}
      </div>

      <textarea
        className="w-full rounded border p-2 text-sm"
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={readOnly}
      />

      <div className="mt-1 flex gap-2">
        <button
          type="button"
          className="text-xs text-blue-600 disabled:opacity-50"
          onClick={saveCustom}
          disabled={readOnly}
        >
          {"\u4fdd\u5b58\u8bf4\u660e"}
        </button>

        {isCustom && (
          <button
            type="button"
            className="text-xs text-slate-500 disabled:opacity-50"
            onClick={resetAuto}
            disabled={readOnly}
          >
            {"\u6062\u590d\u81ea\u52a8\u751f\u6210"}
          </button>
        )}
      </div>
    </div>
  );
}
