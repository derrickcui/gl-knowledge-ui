"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ExplainTreeNode, RiskFinding } from "./types";

type LogicViewProps = {
  tree: ExplainTreeNode | null;
  highlightedNodeId?: string | null;
  riskMap?: Record<string, RiskFinding[]>;
};

function operatorBadgeStyle(operator: string) {
  if (operator === "AND") return "bg-blue-100 text-blue-700 border-blue-200";
  if (operator === "OR") return "bg-amber-100 text-amber-700 border-amber-200";
  if (operator === "EXCLUDE" || operator === "NOT") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function simplifyTermText(raw?: string | null) {
  if (!raw) return "TERM";
  const match = raw.match(/[「“](.+?)[」”]/);
  if (match?.[1]) return match[1];
  return raw.replace(/^文档内容涉及相关概念[:：]\s*/, "").trim();
}

function depthHeatStyle(level: number) {
  const alpha = Math.min(0.32, 0.06 + level * 0.06);
  return { backgroundColor: `rgba(30, 64, 175, ${alpha})` };
}

function NodeRiskTooltip({ risks }: { risks: RiskFinding[] }) {
  if (risks.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-full top-0 z-10 ml-2 hidden min-w-[240px] rounded border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg group-hover:block">
      <div className="mb-1 font-medium text-slate-900">风险贡献</div>
      <ul className="space-y-1">
        {risks.map((risk) => (
          <li key={`${risk.id}-${risk.text}`}>
            ⚠ {risk.text} {risk.scoreImpact > 0 ? `(+${risk.scoreImpact})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TreeNode({
  node,
  nodeId,
  level,
  expandedMap,
  onToggle,
  registerNodeRef,
  highlightedNodeId,
  riskMap,
}: {
  node: ExplainTreeNode;
  nodeId: string;
  level: number;
  expandedMap: Record<string, boolean>;
  onToggle: (id: string) => void;
  registerNodeRef: (nodeId: string, element: HTMLDivElement | null) => void;
  highlightedNodeId?: string | null;
  riskMap: Record<string, RiskFinding[]>;
}) {
  const children = Array.isArray(node.children) ? node.children : [];
  const type = (node.type ?? "").toUpperCase();
  const operator = (node.operator ?? "GROUP").toUpperCase();
  const isLeaf = children.length === 0 || type === "TERM";
  const expanded = expandedMap[nodeId] ?? true;
  const isActive = Boolean(highlightedNodeId) && highlightedNodeId === nodeId;
  const risks = riskMap[nodeId] ?? [];
  const hasRisk = risks.length > 0;

  const operatorTone =
    operator === "OR"
      ? "border-l-4 border-l-amber-400"
      : operator === "EXCLUDE" || operator === "NOT"
        ? "border-l-4 border-l-red-400"
        : "";

  return (
    <div style={{ marginLeft: level * 14 }}>
      <div className="group relative mb-2">
        <div
          ref={(element) => registerNodeRef(nodeId, element)}
          style={depthHeatStyle(level + 1)}
          className={`rounded border px-3 py-2 text-sm transition-colors ${
            isActive ? "border-fuchsia-400 bg-fuchsia-50" : "border-slate-200"
          } ${operatorTone} ${hasRisk ? "shadow-[inset_3px_0_0_0_rgba(245,158,11,0.9)]" : ""}`}
        >
          {isLeaf ? (
            <div className="text-slate-800">TERM: {simplifyTermText(node.text)}</div>
          ) : (
            <button
              type="button"
              onClick={() => onToggle(nodeId)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className={`rounded border px-2 py-0.5 text-xs ${operatorBadgeStyle(operator)}`}>
                {operator}
              </span>
              <span className="text-xs text-slate-500">{expanded ? "收起" : "展开"}</span>
            </button>
          )}

          {!isLeaf && type ? (
            <div className="mt-1 text-[11px] text-slate-500">节点类型：{type}</div>
          ) : null}
          <div className="mt-1 text-[11px] text-slate-500">复杂度层级：L{level + 1}</div>
          {hasRisk ? <div className="mt-1 text-[11px] text-amber-700">含风险信号（hover查看）</div> : null}
        </div>

        <NodeRiskTooltip risks={risks} />
      </div>

      {!isLeaf && expanded
        ? children.map((child, index) => {
            const childId = child.id || `${nodeId}.${index}`;
            return (
              <TreeNode
                key={childId}
                node={child}
                nodeId={childId}
                level={level + 1}
                expandedMap={expandedMap}
                onToggle={onToggle}
                registerNodeRef={registerNodeRef}
                highlightedNodeId={highlightedNodeId}
                riskMap={riskMap}
              />
            );
          })
        : null}
    </div>
  );
}

export function LogicView({ tree, highlightedNodeId, riskMap = {} }: LogicViewProps) {
  const rootId = tree?.id || "root";
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({
    [rootId]: true,
  });
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const normalizedTree = useMemo(() => tree, [tree]);

  function toggle(id: string) {
    setExpandedMap((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }

  function registerNodeRef(nodeId: string, element: HTMLDivElement | null) {
    nodeRefs.current[nodeId] = element;
  }

  useEffect(() => {
    if (!normalizedTree || !highlightedNodeId) return;

    function findPath(node: ExplainTreeNode, nodeId: string, targetId: string): string[] | null {
      if (nodeId === targetId) return [nodeId];
      const children = Array.isArray(node.children) ? node.children : [];
      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const childId = child.id || `${nodeId}.${index}`;
        const childPath = findPath(child, childId, targetId);
        if (childPath) return [nodeId, ...childPath];
      }
      return null;
    }

    const path = findPath(normalizedTree, rootId, highlightedNodeId);
    if (!path || path.length === 0) return;

    setExpandedMap((prev) => {
      const next = { ...prev };
      path.forEach((id) => {
        next[id] = true;
      });
      return next;
    });
  }, [highlightedNodeId, normalizedTree, rootId]);

  useEffect(() => {
    if (!highlightedNodeId) return;
    const target = nodeRefs.current[highlightedNodeId];
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    });
  }, [expandedMap, highlightedNodeId]);

  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">规则结构视图</h3>
      <div className="mt-3">
        {normalizedTree ? (
          <TreeNode
            node={normalizedTree}
            nodeId={rootId}
            level={0}
            expandedMap={expandedMap}
            onToggle={toggle}
            registerNodeRef={registerNodeRef}
            highlightedNodeId={highlightedNodeId}
            riskMap={riskMap}
          />
        ) : (
          <div className="rounded border border-dashed p-3 text-sm text-slate-500">暂无逻辑结构数据</div>
        )}
      </div>
    </section>
  );
}
