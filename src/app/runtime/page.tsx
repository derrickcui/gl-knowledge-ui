"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  activateRuntimeEnvironment,
  fetchRuntimeEnvironments,
} from "@/lib/runtime-api";
import type { RuntimeEnvironment } from "@/lib/runtime-api";
import {
  readDefaultRuntimeSceneSelection,
  writeDefaultRuntimeSceneSelection,
} from "@/lib/runtime-default-scene";

type StatusFilter = "ALL" | "DRAFT" | "ACTIVE" | "ARCHIVED";

function statusLabel(status?: string) {
  if (status === "ACTIVE") return "\u5df2\u542f\u7528";
  if (status === "ARCHIVED") return "\u5df2\u505c\u7528";
  return "\u8349\u7a3f";
}

function envLabel(envType?: string) {
  return envType === "PROD" ? "\u6b63\u5f0f\u73af\u5883" : "\u6d4b\u8bd5\u73af\u5883";
}

function scopeLabel(item: RuntimeEnvironment) {
  if (item.scopeLabel) return item.scopeLabel;
  if (item.scopeType === "FULL") return "\u5168\u90e8\u6587\u6863";
  if (item.scopeType === "CUSTOM") return "\u6307\u5b9a\u7b5b\u9009\u8303\u56f4";
  if (typeof item.scopeValue === "number") return `\u6700\u8fd1${item.scopeValue}\u6761`;
  return "\u6700\u8fd1\u4e00\u90e8\u5206\u6587\u6863";
}

export default function RuntimeListPage() {
  const [items, setItems] = useState<RuntimeEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activateId, setActivateId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [defaultSceneId, setDefaultSceneId] = useState<number | null>(null);

  async function loadList(nextKeyword = keyword, nextStatus = statusFilter) {
    setLoading(true);
    const result = await fetchRuntimeEnvironments({
      name: nextKeyword,
      keyword: nextKeyword,
      status: nextStatus,
    });
    if (!result.data) {
      setError(result.error ?? "\u573a\u666f\u5217\u8868\u52a0\u8f7d\u5931\u8d25\u3002");
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

  useEffect(() => {
    const saved = readDefaultRuntimeSceneSelection();
    setDefaultSceneId(saved?.id ?? null);
  }, []);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadList(keyword, statusFilter);
  }

  async function handleActivate() {
    if (!activateId) return;
    const result = await activateRuntimeEnvironment(activateId);
    if (!result.data) {
      setNotice(result.error ?? "\u542f\u7528\u5931\u8d25\u3002");
      return;
    }
    setNotice("\u573a\u666f\u5df2\u542f\u7528\u3002");
    setActivateId(null);
    loadList();
  }

  function handleSetDefault(item: RuntimeEnvironment) {
    setDefaultSceneId(item.id);
    writeDefaultRuntimeSceneSelection({
      id: item.id,
      name: item.name ?? `Scene ${item.id}`,
      datasetName: item.datasetName,
    });
    setNotice("\u5df2\u8bbe\u4e3a\u9ed8\u8ba4\u9a8c\u8bc1\u573a\u666f\u3002");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{"\u6570\u636e\u8fd0\u884c\u573a\u666f"}</h1>
        <Link
          href="/runtime/new"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
        >
          {"+ \u65b0\u5efa\u573a\u666f"}
        </Link>
      </div>

      <form
        className="mb-4 grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_180px_120px]"
        onSubmit={handleSearchSubmit}
      >
        <label className="text-sm">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={"\u573a\u666f\u540d\u79f0"}
            className="w-full rounded-md border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="ALL">{"\u5168\u90e8"}</option>
            <option value="DRAFT">{"\u8349\u7a3f"}</option>
            <option value="ACTIVE">{"\u5df2\u542f\u7528"}</option>
            <option value="ARCHIVED">{"\u5df2\u505c\u7528"}</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="h-[42px] w-full rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
          >
            {"\u67e5\u8be2"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border bg-white">
        <div className="grid grid-cols-[1.5fr_0.9fr_1fr_1fr_0.8fr_1fr] gap-3 border-b px-4 py-3 text-sm font-medium text-slate-700">
          <div>{"\u573a\u666f\u540d\u79f0"}</div>
          <div>{"\u4f7f\u7528\u73af\u5883"}</div>
          <div>{"\u6587\u6863\u5e93"}</div>
          <div>{"\u8fd0\u884c\u8303\u56f4"}</div>
          <div>{"\u72b6\u6001"}</div>
          <div>{"\u64cd\u4f5c"}</div>
        </div>
        {loading && <div className="px-4 py-6 text-sm text-slate-500">{"\u52a0\u8f7d\u4e2d..."}</div>}
        {!loading && error && <div className="px-4 py-6 text-sm text-red-600">{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className="px-4 py-6 text-sm text-slate-500">{"\u6682\u65e0\u573a\u666f"}</div>
        )}
        {!loading &&
          !error &&
          items.map((item) => {
            const editable = item.editable ?? (item.status ?? "DRAFT") === "DRAFT";
            const activatable = item.activatable ?? editable;
            return (
              <div
                key={item.id}
                className="group grid grid-cols-[1.5fr_0.9fr_1fr_1fr_0.8fr_1fr] gap-3 border-b px-4 py-3 text-sm last:border-b-0"
              >
                <div>{item.name ?? `\u573a\u666f ${item.id}`}</div>
                <div>{envLabel(item.envType)}</div>
                <div>{item.datasetName ?? "--"}</div>
                <div>{scopeLabel(item)}</div>
                <div>{statusLabel(item.status)}</div>
                <div className="flex items-center gap-3">
                  <label
                    className={`flex items-center gap-1 text-slate-600 transition-opacity ${
                      defaultSceneId === item.id
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                    }`}
                  >
                    <input
                      type="radio"
                      name="default-runtime-scene"
                      checked={defaultSceneId === item.id}
                      onChange={() => handleSetDefault(item)}
                    />
                    <span>{"\u9ed8\u8ba4"}</span>
                  </label>
                  <Link
                    href={editable ? `/runtime/${item.id}` : `/runtime/${item.id}?readonly=1`}
                    className="text-blue-600 hover:underline"
                  >
                    {editable ? "\u7f16\u8f91" : "\u67e5\u770b"}
                  </Link>
                  {activatable && (
                    <button
                      type="button"
                      onClick={() => setActivateId(item.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {"\u542f\u7528"}
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
            <h3 className="text-base font-semibold">
              {"\u786e\u8ba4\u542f\u7528\u8be5\u6570\u636e\u8fd0\u884c\u573a\u666f\uff1f"}
            </h3>
            <div className="mt-3 text-sm text-slate-700">
              {"\u542f\u7528\u540e\uff1a"}
              <div className="mt-2 space-y-1 text-slate-600">
                <div>{"- \u573a\u666f\u5c06\u56fa\u5b9a"}</div>
                <div>{"- \u5c06\u7528\u4e8e\u89c4\u5219\u6548\u679c\u9a8c\u8bc1"}</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActivateId(null)}
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
              >
                {"\u53d6\u6d88"}
              </button>
              <button
                type="button"
                onClick={handleActivate}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white"
              >
                {"\u542f\u7528\u573a\u666f"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
