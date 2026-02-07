"use client";

import { ReviewActionError } from "./reviewErrorTypes";
import { t } from "@/i18n";

interface Props {
  error: ReviewActionError;
  onClose: () => void;
  onFix?: (path?: number[]) => void;
}

export default function ReviewErrorBanner({
  error,
  onClose,
  onFix,
}: Props) {
  const view = mapErrorToView(error);

  return (
    <div className={`rounded border p-3 ${view.style}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{view.title}</div>
          <div className="mt-1 text-sm">{view.description}</div>
          {view.hint && (
            <div className="mt-1 text-xs text-slate-600">
              {t("review.error.suggestion", { hint: view.hint })}
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:underline"
          onClick={onClose}
        >
          {t("review.error.close")}
        </button>
      </div>

      {view.fixable && onFix && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => onFix(view.focusPath)}
          >
            {t("review.error.fix")}
          </button>
        </div>
      )}
    </div>
  );
}

function mapErrorToView(error: ReviewActionError) {
  if (error.status === 409) {
    return {
      style: "border-amber-400 bg-amber-50",
      title: t("review.error.operationIncomplete"),
      description:
        error.code === "RULE_QUALITY_BLOCKED"
          ? t("review.error.qualityBlocked")
          : t("review.error.statusChanged"),
      hint: t("review.error.hintCheckReview"),
      fixable: error.code === "RULE_QUALITY_BLOCKED",
      focusPath: undefined,
    };
  }

  if (error.status === 422) {
    const firstPath = normalizePath(error.details?.errors?.[0]?.path);
    return {
      style: "border-blue-400 bg-blue-50",
      title: t("review.error.ruleCannotSubmit"),
      description: t("review.error.ruleQualityFailed"),
      hint: t("review.error.hintFixAndResubmit"),
      fixable: true,
      focusPath: firstPath,
    };
  }

  return {
    style: "border-red-400 bg-red-50",
    title: t("review.error.system"),
    description: t("review.error.systemDesc"),
    hint: t("review.error.systemHint"),
    fixable: false,
    focusPath: undefined,
  };
}

function normalizePath(raw: unknown): number[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw) && raw.every((n) => Number.isFinite(n))) {
    return raw as number[];
  }
  if (typeof raw === "string") {
    const parts = raw
      .split(/[.,/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part));
    if (parts.length && parts.every((num) => Number.isFinite(num))) {
      return parts as number[];
    }
  }
  return undefined;
}
