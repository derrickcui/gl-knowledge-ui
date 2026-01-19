"use client";

import { ReviewActionError } from "./reviewErrorTypes";

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
              建议：{view.hint}
            </div>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-slate-500 hover:underline"
          onClick={onClose}
        >
          关闭
        </button>
      </div>

      {view.fixable && onFix && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => onFix(view.focusPath)}
          >
            去编辑器修复
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
      title: "操作未完成",
      description:
        error.code === "RULE_QUALITY_BLOCKED"
          ? "规则存在严重质量问题，无法通过评审。"
          : "评审状态已发生变化，当前操作无法继续。",
      hint: "请查看评审内容或返回列表刷新状态。",
      fixable: error.code === "RULE_QUALITY_BLOCKED",
      focusPath: undefined,
    };
  }

  if (error.status === 422) {
    const firstPath = normalizePath(error.details?.errors?.[0]?.path);
    return {
      style: "border-blue-400 bg-blue-50",
      title: "规则无法提交",
      description: "规则未通过质量校验。",
      hint: "请返回编辑器修复后重新提交评审。",
      fixable: true,
      focusPath: firstPath,
    };
  }

  return {
    style: "border-red-400 bg-red-50",
    title: "系统错误",
    description: "系统暂时无法完成操作，请稍后重试。",
    hint: "如问题持续存在，请联系管理员。",
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
