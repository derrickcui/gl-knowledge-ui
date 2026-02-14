"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  activateRuntimeEnvironment,
  fetchRuntimeEnvironments,
} from "@/lib/runtime-api";
import type { RuntimeEnvironment } from "@/lib/runtime-api";

type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";

function statusLabel(status?: string) {
  if (status === "ACTIVE") return "已启用";
  if (status === "ARCHIVED") return "已停用";
  return "草稿";
}

function envLabel(envType?: string) {
  return envType === "PROD" ? "正式环境" : "测试环境";
}

function scopeLabel(item: RuntimeEnvironment) {
  if (item.scopeLabel) return item.scopeLabel;
  if (item.scopeType === "FULL") return "全部文档";
  if (item.scopeType === "CUSTOM") return "指定筛选范围";
  if (typeof item.scopeValue === "number") return `最近${item.scopeValue}条`;
  return "最近一部分文档";
}

export default function RuntimeListPage() {
  const [items, setItems] = useState<RuntimeEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activateId, setActivateId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  async function loadList(nextKeyword = keyword, nextStatus = statusFilter) {
    setLoading(true);
    const result = await fetchRuntimeEnvironments({
      name: nextKeyword,
      keyword: nextKeyword,
      status: nextStatus,
    });
    if (!result.data) {
      setError(result.error ?? "场景列表加载失败。");
      setItems([]);
      setLoading(false);
      return;
    }
    setError("");
    setItems(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadList();
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadList(keyword, statusFilter);
  }

  async function handleActivate() {
    if (!activateId) return;
    const result = await activateRuntimeEnvironment(activateId);
    if (!result.data) {
      setNotice(result.error ?? "启用失败。");
      return;
    }
    setNotice("场景已启用。");
    setActivateId(null);
    loadList();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">数据运行场景</h1>
        <Link
          href="/runtime/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
        >
          + 新建场景
        </Link>
      </div>

      <form
        className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_120px]"
        onSubmit={handleSearchSubmit}
      >
        <label className="text-sm">
          <div className="mb-1 text-slate-600">搜索</div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="场景名称"
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <div className="mb-1 text-slate-600">状态</div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="ALL">全部</option>
            <option value="DRAFT">草稿</option>
            <option value="ACTIVE">已启用</option>
            <option value="ARCHIVED">已停用</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-[42px] w-full rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
          >
            查询
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_0.8fr_1fr] gap-3 border-b px-4 py-3 text-sm font-medium text-slate-700">
          <div>场景名称</div>
          <div>使用环境</div>
          <div>文档库</div>
          <div>运行范围</div>
          <div>状态</div>
          <div>操作</div>
        </div>
        {loading && <div className="px-4 py-6 text-sm text-slate-500">加载中...</div>}
        {!loading && error && <div className="px-4 py-6 text-sm text-red-600">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-500">暂无场景</div>
        )}
        {!loading &&
          !error &&
          items.map((item) => {
            const editable = item.editable ?? (item.status ?? "DRAFT") === "DRAFT";
            const activatable = item.activatable ?? editable;
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_0.8fr_1fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
              >
                <div>{item.name ?? `场景 ${item.id}`}</div>
                <div>{envLabel(item.envType)}</div>
                <div>{item.datasetName ?? "--"}</div>
                <div>{scopeLabel(item)}</div>
                <div>{statusLabel(item.status)}</div>
                <div className="flex items-center gap-3">
                  <Link
                    href={editable ? `/runtime/${item.id}` : `/runtime/${item.id}?readonly=1`}
                    className="text-blue-600 hover:underline"
                  >
                    {editable ? "编辑" : "查看"}
                  </Link>
                  {activatable && (
                    <button
                      type="button"
                      onClick={() => setActivateId(item.id)}
                      className="text-blue-600 hover:underline"
                    >
                      启用
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div className="mt-3 text-sm text-slate-600">{notice}</div>

      {activateId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold">确认启用该数据运行场景？</h3>
            <div className="mt-3 text-sm text-slate-700">
              启用后：
              <div className="mt-2 space-y-1 text-slate-600">
                <div>- 场景将固定</div>
                <div>- 将用于规则效果验证</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivateId(null)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleActivate}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
              >
                启用场景
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
