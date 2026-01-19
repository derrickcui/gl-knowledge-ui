"use client";

import { AntiPatternFinding } from "./antiPatternTypes";

interface Props {
  finding: AntiPatternFinding;
  onHoverPath?: (path: number[] | null) => void;
  onClickPath?: (path: number[]) => void;
}

export default function AntiPatternItem({
  finding,
  onHoverPath,
  onClickPath,
}: Props) {
  const color =
    finding.severity === "ERROR"
      ? "border-red-400"
      : finding.severity === "WARNING"
      ? "border-amber-400"
      : "border-blue-400";

  const label =
    finding.severity === "ERROR"
      ? "严重问题"
      : finding.severity === "WARNING"
      ? "潜在问题"
      : "提示";

  return (
    <div className={`border-l-4 ${color} py-2 pl-3`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm text-slate-700">{finding.message}</div>
      {finding.suggestion && (
        <div className="mt-1 text-xs text-slate-600">
          建议修复：{finding.suggestion}
        </div>
      )}
      {finding.path && (
        <div
          className="mt-1 cursor-pointer text-xs text-blue-600 hover:underline"
          onMouseEnter={() => onHoverPath?.(finding.path!)}
          onMouseLeave={() => onHoverPath?.(null)}
          onClick={() => onClickPath?.(finding.path!)}
        >
          ↳ 定位到对应规则条件
        </div>
      )}
    </div>
  );
}
