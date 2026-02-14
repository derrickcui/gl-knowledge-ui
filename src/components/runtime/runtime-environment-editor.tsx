"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activateRuntimeEnvironment,
  createRuntimeEnvironment,
  fetchRuntimeDatasets,
  fetchRuntimeEnvironmentById,
  updateRuntimeEnvironment,
} from "@/lib/runtime-api";
import type { RuntimeDataset, RuntimeEnvironment } from "@/lib/runtime-api";

type SceneStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type RuntimeScope = "RECENT" | "ALL" | "FILTER";
type RuntimeEnv = "TEST" | "PROD";
type FieldKind = "TEXT" | "ORG" | "DATE" | "OTHER";
type SystemItemKey = "TITLE" | "BODY" | "PUBLISHER" | "PUBLISHED_AT";

type Props = {
  environmentId?: number;
  forceReadOnly?: boolean;
};

interface UiField {
  label: string;
  code: string;
  kind: FieldKind;
}

interface UiDataset {
  id: string;
  label: string;
  code: string;
  documentCount: number | null;
  fields: UiField[];
}

interface SystemItem {
  key: SystemItemKey;
  label: string;
  expectedKind: Exclude<FieldKind, "OTHER">;
}

const systemItems: SystemItem[] = [
  { key: "TITLE", label: "标题", expectedKind: "TEXT" },
  { key: "BODY", label: "正文", expectedKind: "TEXT" },
  { key: "PUBLISHER", label: "发布单位", expectedKind: "ORG" },
  { key: "PUBLISHED_AT", label: "发布日期", expectedKind: "DATE" },
];

const statusLabel: Record<SceneStatus, string> = {
  DRAFT: "草稿",
  ACTIVE: "已启用",
  ARCHIVED: "已停用",
};

const ORG_KEYWORDS = ["publisher", "author", "issuer", "department", "source", "org", "unit"];
const DATE_KEYWORDS = ["date", "time", "timestamp", "publish", "created", "modified", "ingest", "effective"];

function inferFieldKind(name: string, type?: string): FieldKind {
  const lowerName = name.toLowerCase();
  const lowerType = (type ?? "").toLowerCase();
  if (DATE_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return "DATE";
  if (lowerType.includes("date")) return "DATE";
  if (ORG_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return "ORG";
  if (lowerType.includes("text") || lowerType.includes("string") || lowerType.includes("pinyin")) return "TEXT";
  return "OTHER";
}

function isSelectableField(name: string, type?: string) {
  const lowerName = name.toLowerCase();
  const lowerType = (type ?? "").toLowerCase();
  if (lowerName.startsWith("_")) return false;
  if (lowerName.startsWith("acl_")) return false;
  if (lowerType.includes("vector")) return false;
  if (lowerName === "uid") return false;
  return true;
}

function formatCount(input: number | null) {
  if (input == null) return "--";
  return new Intl.NumberFormat("zh-CN").format(input);
}

function normalizeDatasets(rawDatasets: RuntimeDataset[]): UiDataset[] {
  return rawDatasets.map((dataset) => {
    const candidates =
      (dataset.fields ?? []).filter((field) => isSelectableField(field.name, field.type)) ?? [];
    const safeSource = candidates.length > 0 ? candidates : dataset.fields ?? [];
    return {
      id: dataset.dataset,
      code: dataset.dataset,
      label: dataset.dataset,
      documentCount: dataset.documentCount,
      fields: safeSource.map((field) => ({
        code: field.name,
        label: field.name,
        kind: inferFieldKind(field.name, field.type),
      })),
    };
  });
}

function pickFirstByKind(fields: UiField[], kind: FieldKind, fallback = "") {
  return fields.find((field) => field.kind === kind)?.code ?? fallback;
}

function buildDefaultMapping(dataset: UiDataset) {
  return {
    TITLE: dataset.fields.find((f) => ["title", "section_title", "subject"].includes(f.code.toLowerCase()))?.code ?? pickFirstByKind(dataset.fields, "TEXT"),
    BODY: dataset.fields.find((f) => ["content", "chunk_content", "raw_content", "summary"].includes(f.code.toLowerCase()))?.code ?? pickFirstByKind(dataset.fields, "TEXT"),
    PUBLISHER: dataset.fields.find((f) => ["publisher", "author", "issuer", "department", "source_name", "source"].includes(f.code.toLowerCase()))?.code ?? pickFirstByKind(dataset.fields, "ORG"),
    PUBLISHED_AT: dataset.fields.find((f) => ["published_at", "effective_date", "created_at", "modified_at", "timestamp", "ingest_at"].includes(f.code.toLowerCase()))?.code ?? pickFirstByKind(dataset.fields, "DATE"),
  } as Record<SystemItemKey, string>;
}

function toScopePayload(runtimeScope: RuntimeScope, recentCount: string, filterText: string) {
  if (runtimeScope === "ALL") return { scopeType: "FULL" as const };
  if (runtimeScope === "FILTER") {
    return { scopeType: "CUSTOM" as const, scopeQuery: filterText.trim() || "id:*" };
  }
  const parsed = Number.parseInt(recentCount, 10);
  return { scopeType: "LAST_N" as const, scopeValue: Number.isFinite(parsed) && parsed > 0 ? parsed : 1000 };
}

function toLogicalField(key: SystemItemKey) {
  if (key === "TITLE") return "DOC_TITLE";
  if (key === "BODY") return "DOC_TEXT";
  if (key === "PUBLISHER") return "DOC_PUBLISHER";
  return "DOC_PUBLISH_DATE";
}

function fromLogicalField(logicalField: string): SystemItemKey | null {
  const key = logicalField.toUpperCase();
  if (key === "DOC_TITLE" || key === "TITLE") return "TITLE";
  if (key === "DOC_TEXT" || key === "DOC_BODY" || key === "BODY") return "BODY";
  if (key === "DOC_PUBLISHER" || key === "PUBLISHER") return "PUBLISHER";
  if (key === "DOC_PUBLISH_DATE" || key === "PUBLISH_DATE" || key === "PUBLISHED_AT") return "PUBLISHED_AT";
  return null;
}

function toRuntimeCode(name: string) {
  const cleaned = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36);
  const stamp = Date.now().toString(36).toUpperCase();
  return cleaned ? `${cleaned}_${stamp}` : `SCENE_${stamp}`;
}

export default function RuntimeEnvironmentEditor({ environmentId, forceReadOnly }: Props) {
  const router = useRouter();
  const [sceneName, setSceneName] = useState("政策文件测试场景");
  const [runtimeEnv, setRuntimeEnv] = useState<RuntimeEnv>("TEST");
  const [description, setDescription] = useState("用于规则效果验证");
  const [status, setStatus] = useState<SceneStatus>("DRAFT");
  const [datasets, setDatasets] = useState<UiDataset[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [runtimeScope, setRuntimeScope] = useState<RuntimeScope>("RECENT");
  const [recentCount, setRecentCount] = useState("1000");
  const [filterText, setFilterText] = useState("发布日期在 2023 年以后");
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingEnvironment, setLoadingEnvironment] = useState(Boolean(environmentId));
  const [runtimeEnvironmentId, setRuntimeEnvironmentId] = useState<number | null>(environmentId ?? null);
  const [runtimeEnvironmentCode, setRuntimeEnvironmentCode] = useState("");
  const [editableByApi, setEditableByApi] = useState<boolean | null>(null);
  const [activatableByApi, setActivatableByApi] = useState<boolean | null>(null);
  const [mapping, setMapping] = useState<Record<SystemItemKey, string>>({
    TITLE: "",
    BODY: "",
    PUBLISHER: "",
    PUBLISHED_AT: "",
  });
  const [loadedEnvironment, setLoadedEnvironment] = useState<RuntimeEnvironment | null>(null);
  const initializedRef = useRef(false);

  const selectedLibrary = useMemo(
    () => datasets.find((item) => item.id === libraryId) ?? null,
    [datasets, libraryId]
  );
  const isLocked =
    Boolean(forceReadOnly) ||
    (editableByApi != null ? !editableByApi : status !== "DRAFT");
  const isRequiredMissing =
    sceneName.trim().length === 0 ||
    !selectedLibrary ||
    Object.values(mapping).some((value) => value.trim().length === 0);

  const mismatchKeys = useMemo(() => {
    if (!selectedLibrary) return [] as SystemItemKey[];
    return systemItems
      .filter((item) => {
        const code = mapping[item.key];
        const selectedField = selectedLibrary.fields.find((field) => field.code === code);
        if (!selectedField || selectedField.kind === "OTHER") return false;
        return selectedField.kind !== item.expectedKind;
      })
      .map((item) => item.key);
  }, [mapping, selectedLibrary]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingDatasets(true);
      const result = await fetchRuntimeDatasets();
      if (!active) return;
      if (!result.data) {
        setNotice(result.error ?? "文档库加载失败。");
        setDatasets([]);
      } else {
        setDatasets(normalizeDatasets(result.data));
      }
      setLoadingDatasets(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!environmentId) return;
    let active = true;
    (async () => {
      setLoadingEnvironment(true);
      const result = await fetchRuntimeEnvironmentById(environmentId);
      if (!active) return;
      if (!result.data) {
        setNotice(result.error ?? "场景加载失败。");
        setLoadingEnvironment(false);
        return;
      }
      setLoadedEnvironment(result.data);
      setLoadingEnvironment(false);
    })();
    return () => {
      active = false;
    };
  }, [environmentId]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (datasets.length === 0 || loadingDatasets) return;

    if (!loadedEnvironment) {
      if (!environmentId) {
        setLibraryId(datasets[0].id);
        setMapping(buildDefaultMapping(datasets[0]));
        initializedRef.current = true;
      }
      return;
    }

    const dataset =
      datasets.find((item) => item.code === loadedEnvironment.datasetName) ?? datasets[0];
    const defaultMapping = buildDefaultMapping(dataset);
    const fromApi = { ...defaultMapping };
    for (const row of loadedEnvironment.fieldMappings ?? []) {
      const key = fromLogicalField(row.logicalField);
      if (key) fromApi[key] = row.physicalField;
    }

    setRuntimeEnvironmentId(loadedEnvironment.id);
    setRuntimeEnvironmentCode(loadedEnvironment.code ?? "");
    setEditableByApi(
      typeof loadedEnvironment.editable === "boolean"
        ? loadedEnvironment.editable
        : null
    );
    setActivatableByApi(
      typeof loadedEnvironment.activatable === "boolean"
        ? loadedEnvironment.activatable
        : null
    );
    setSceneName(loadedEnvironment.name ?? sceneName);
    setDescription(loadedEnvironment.description ?? "");
    setRuntimeEnv(loadedEnvironment.envType === "PROD" ? "PROD" : "TEST");
    setStatus(
      loadedEnvironment.status === "ACTIVE"
        ? "ACTIVE"
        : loadedEnvironment.status === "ARCHIVED"
        ? "ARCHIVED"
        : "DRAFT"
    );
    setLibraryId(dataset.id);
    setMapping(fromApi);

    if (loadedEnvironment.scopeType === "FULL") {
      setRuntimeScope("ALL");
    } else if (loadedEnvironment.scopeType === "CUSTOM") {
      setRuntimeScope("FILTER");
      setFilterText(loadedEnvironment.scopeQuery ?? "");
    } else {
      setRuntimeScope("RECENT");
      setRecentCount(String(loadedEnvironment.scopeValue ?? 1000));
    }
    initializedRef.current = true;
  }, [datasets, loadingDatasets, loadedEnvironment, environmentId, sceneName]);

  function handleLibraryChange(nextLibraryId: string) {
    if (isLocked) return;
    const nextLibrary = datasets.find((item) => item.id === nextLibraryId);
    if (!nextLibrary) return;
    setLibraryId(nextLibraryId);
    setMapping(buildDefaultMapping(nextLibrary));
  }

  async function handleSave() {
    if (isLocked) return;
    if (isRequiredMissing || !selectedLibrary) {
      setNotice("请先补全必填信息后再保存。");
      return;
    }
    setSaveLoading(true);
    setNotice("");
    const scopePayload = toScopePayload(runtimeScope, recentCount, filterText);
    const fieldMappings = (Object.entries(mapping) as Array<[SystemItemKey, string]>)
      .filter(([, physicalField]) => physicalField.trim().length > 0)
      .map(([systemKey, physicalField]) => ({
        logicalField: toLogicalField(systemKey),
        physicalField,
        fieldType: selectedLibrary.fields.find((field) => field.code === physicalField)?.kind === "DATE" ? "date" : "text",
      }));

    if (runtimeEnvironmentId == null) {
      const generatedCode = toRuntimeCode(sceneName);
      const createResult = await createRuntimeEnvironment({
        name: sceneName.trim(),
        code: generatedCode,
        description: description.trim() || undefined,
        envType: runtimeEnv === "PROD" ? "PROD" : "TEST",
        datasetName: selectedLibrary.code,
        fieldMappings,
        ...scopePayload,
      });
      setSaveLoading(false);
      if (!createResult.data) {
        setNotice(createResult.error ?? "场景保存失败。");
        return;
      }
      setRuntimeEnvironmentId(createResult.data.id);
      setRuntimeEnvironmentCode(createResult.data.code ?? generatedCode);
      setStatus(createResult.data.status === "ACTIVE" ? "ACTIVE" : "DRAFT");
      setNotice("场景已保存。");
      router.replace(`/runtime/${createResult.data.id}`);
      return;
    }

    const updateResult = await updateRuntimeEnvironment(runtimeEnvironmentId, {
      name: sceneName.trim(),
      description: description.trim() || undefined,
      datasetName: selectedLibrary.code,
      fieldMappings,
      ...scopePayload,
    });
    setSaveLoading(false);
    if (!updateResult.data) {
      setNotice(updateResult.error ?? "场景保存失败。");
      return;
    }
    setStatus(
      updateResult.data.status === "ACTIVE"
        ? "ACTIVE"
        : updateResult.data.status === "ARCHIVED"
        ? "ARCHIVED"
        : "DRAFT"
    );
    setRuntimeEnvironmentCode(updateResult.data.code ?? runtimeEnvironmentCode);
    setNotice("场景已保存。");
  }

  async function handleActivate() {
    if (isLocked || isRequiredMissing || runtimeEnvironmentId == null) return;
    const result = await activateRuntimeEnvironment(runtimeEnvironmentId);
    if (!result.data) {
      setNotice(result.error ?? "启用失败。");
      return;
    }
    setStatus("ACTIVE");
    setNotice("场景已启用。");
    setShowActivateModal(false);
  }

  if (loadingEnvironment) {
    return <div className="mx-auto max-w-5xl px-6 py-6 text-sm text-slate-600">加载中...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-6">
      <div className="mb-6 flex items-center gap-4">
        <button type="button" onClick={() => router.push("/runtime")} className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          ← 返回
        </button>
        <h1 className="text-xl font-semibold">📘 数据运行场景</h1>
      </div>

      <div className="space-y-5">
        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">场景信息</h2>
          <div className="space-y-4">
            <label className="block">
              <div className="mb-1 text-sm text-slate-700">场景名称 *</div>
              <input value={sceneName} onChange={(event) => setSceneName(event.target.value)} disabled={isLocked} className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100" />
            </label>
            <div>
              <div className="mb-1 text-sm text-slate-700">使用环境 *</div>
              <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={runtimeEnv === "TEST"} onChange={() => setRuntimeEnv("TEST")} disabled={isLocked} />
                  测试环境
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={runtimeEnv === "PROD"} onChange={() => setRuntimeEnv("PROD")} disabled={isLocked} />
                  正式环境
                </label>
              </div>
            </div>
            <label className="block">
              <div className="mb-1 text-sm text-slate-700">说明</div>
              <input value={description} onChange={(event) => setDescription(event.target.value)} disabled={isLocked} className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100" />
            </label>
            <div className="text-sm text-slate-700">
              当前状态：
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{statusLabel[status]}</span>
            </div>
            {runtimeEnvironmentId != null && (
              <div className="text-xs text-slate-500">场景编号：{runtimeEnvironmentCode || runtimeEnvironmentId}</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">选择文档库</h2>
          <label className="block">
            <div className="mb-1 text-sm text-slate-700">文档库 *</div>
            <select value={libraryId} onChange={(event) => handleLibraryChange(event.target.value)} disabled={isLocked || loadingDatasets || datasets.length === 0} className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100">
              {loadingDatasets && <option value="">加载中...</option>}
              {!loadingDatasets && datasets.length === 0 && <option value="">暂无可用文档库</option>}
              {!loadingDatasets && datasets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <div className="mt-3 text-sm text-slate-700">文档数量：{formatCount(selectedLibrary?.documentCount ?? null)} 篇</div>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">信息项对应关系</h2>
          <div className="mb-2 grid grid-cols-2 border-b pb-2 text-sm font-medium text-slate-700">
            <div>系统中的信息项</div>
            <div>文档库中的信息</div>
          </div>
          <div className="space-y-3">
            {systemItems.map((item) => (
              <div key={item.key} className="grid grid-cols-2 items-start gap-3">
                <div className="pt-2 text-sm text-slate-700">{item.label}</div>
                <div>
                  <select value={mapping[item.key]} onChange={(event) => setMapping((prev) => ({ ...prev, [item.key]: event.target.value }))} disabled={isLocked || !selectedLibrary} className="w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100">
                    <option value="">请选择</option>
                    {(selectedLibrary?.fields ?? []).map((field) => (
                      <option key={field.code} value={field.code}>{field.label}</option>
                    ))}
                  </select>
                  {mismatchKeys.includes(item.key) && <div className="mt-1 text-xs text-amber-600">⚠ 该信息项类型不一致</div>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-5">
          <h2 className="mb-4 text-base font-semibold">运行范围</h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <div className="flex items-center gap-2">
                <input type="radio" checked={runtimeScope === "RECENT"} onChange={() => setRuntimeScope("RECENT")} disabled={isLocked} />
                最近一部分文档
              </div>
              {runtimeScope === "RECENT" && (
                <div className="mt-2 pl-6">数量：<input value={recentCount} onChange={(event) => setRecentCount(event.target.value)} disabled={isLocked} className="ml-2 w-32 rounded-md border px-3 py-1.5 text-sm disabled:bg-slate-100" /></div>
              )}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={runtimeScope === "ALL"} onChange={() => setRuntimeScope("ALL")} disabled={isLocked} />
              所有文档
            </label>
            <label className="block">
              <div className="flex items-center gap-2">
                <input type="radio" checked={runtimeScope === "FILTER"} onChange={() => setRuntimeScope("FILTER")} disabled={isLocked} />
                指定筛选范围
              </div>
              {runtimeScope === "FILTER" && (
                <input value={filterText} onChange={(event) => setFilterText(event.target.value)} disabled={isLocked} placeholder="输入筛选条件（例如：发布日期在2023年以后）" className="mt-2 w-full rounded-md border px-3 py-2 text-sm disabled:bg-slate-100" />
              )}
            </label>
          </div>
        </section>
      </div>

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <div className="text-sm text-slate-600">{notice}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => router.push("/runtime")} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">取消</button>
          {!isLocked && (
            <button type="button" onClick={handleSave} disabled={saveLoading} className="rounded-md border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100">{saveLoading ? "保存中..." : "保存"}</button>
          )}
          {!isLocked && (
            <button type="button" onClick={() => setShowActivateModal(true)} disabled={isRequiredMissing || runtimeEnvironmentId == null || activatableByApi === false} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:bg-slate-300">启用场景</button>
          )}
        </div>
      </div>

      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold">确认启用该数据运行场景？</h3>
            <div className="mt-3 text-sm text-slate-700">启用后：<div className="mt-2 space-y-1 text-slate-600"><div>- 场景将固定</div><div>- 将用于规则效果验证</div></div></div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowActivateModal(false)} className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">取消</button>
              <button type="button" onClick={handleActivate} className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white">启用场景</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
