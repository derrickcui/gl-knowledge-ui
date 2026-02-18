import { t } from "@/i18n";
import type { ValidationIssue } from "./validation";

export function ValidationPanel({
  issues,
  onAutoFix,
}: {
  issues: ValidationIssue[];
  onAutoFix?: () => void;
}) {
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm font-semibold">{t("ruleEditor.validation.title")}</div>
      {issues.length === 0 ? (
        <div className="mt-3 text-sm text-emerald-700">{t("ruleEditor.validation.ok")}</div>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="text-red-700">{t("ruleEditor.validation.errors", { count: errors.length })}</div>
          <div className="text-amber-700">{t("ruleEditor.validation.warnings", { count: warnings.length })}</div>
          {errors.length > 0 && onAutoFix && (
            <button
              type="button"
              className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100"
              onClick={onAutoFix}
            >
              {t("ruleEditor.validation.autoFix")}
            </button>
          )}
          {issues.map((item, index) => (
            <div
              key={`${item.nodeId}-${index}`}
              className={`rounded border px-2 py-1 text-xs ${
                item.severity === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
