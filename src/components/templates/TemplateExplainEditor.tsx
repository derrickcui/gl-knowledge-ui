"use client";

import { t } from "@/i18n";

type ExplainState = {
  success: string;
  fail: string;
};

export function TemplateExplainEditor({
  value,
  disabled = false,
  onChange,
}: {
  value: ExplainState;
  disabled?: boolean;
  onChange: (next: ExplainState) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="text-sm font-semibold">{t("templates.explain.title")}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("templates.explain.hit")}</label>
          <textarea
            className="min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={value.success}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                success: event.target.value,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">{t("templates.explain.miss")}</label>
          <textarea
            className="min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
            value={value.fail}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                fail: event.target.value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

export type { ExplainState };
