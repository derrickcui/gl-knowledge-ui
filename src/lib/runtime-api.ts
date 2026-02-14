type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

const RUNTIME_API_PROXY = "/api/runtime";
const RUNTIME_SERVICE_DOWN_MESSAGE =
  "runtime-service 未启动或无法连接，请启动服务后重试。";
const RUNTIME_SERVICE_ERROR_MESSAGE = "runtime-service 请求失败，请稍后重试。";

type RuntimeDatasetFieldApi = {
  name: string;
  type?: string;
  indexed: boolean;
  stored: boolean;
  multiValued: boolean;
};

type RuntimeDatasetApi = {
  dataset: string;
  fields: RuntimeDatasetFieldApi[];
  documentCount?: unknown;
  docCount?: unknown;
  totalDocs?: unknown;
  total?: unknown;
  count?: unknown;
};

type RuntimeDatasetsApiResponse = {
  success: boolean;
  data?: RuntimeDatasetApi[] | null;
  error?: unknown;
};

type RuntimeFieldMappingItem = {
  logicalField: string;
  physicalField: string;
  fieldType?: string;
};

type RuntimeEnvironmentApiResponse = {
  success: boolean;
  data?: RuntimeEnvironment | null;
  error?: unknown;
};

type RuntimeEnvironmentListApiResponse = {
  success: boolean;
  data?:
    | RuntimeEnvironment[]
    | {
        items?: RuntimeEnvironment[] | null;
        page?: number;
        size?: number;
        total?: number;
      }
    | null;
  error?: unknown;
};

export type RuntimeDatasetField = {
  name: string;
  type?: string;
  indexed: boolean;
  stored: boolean;
  multiValued: boolean;
};

export type RuntimeDataset = {
  dataset: string;
  fields: RuntimeDatasetField[];
  documentCount: number | null;
};

export type RuntimeEnvironment = {
  id: number;
  code?: string;
  name?: string;
  description?: string;
  envType?: "DEV" | "TEST" | "PROD" | string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  datasetName?: string;
  scopeType?: "LAST_N" | "FULL" | "CUSTOM" | string;
  scopeValue?: number;
  scopeQuery?: string;
  scopeLabel?: string;
  fieldMappings?: RuntimeFieldMappingItem[];
  createdAt?: string;
  updatedAt?: string;
  editable?: boolean;
  activatable?: boolean;
};

export type CreateRuntimeEnvironmentRequest = {
  name: string;
  code: string;
  description?: string;
  envType: "DEV" | "TEST" | "PROD";
  datasetName: string;
  scopeType?: "LAST_N" | "FULL" | "CUSTOM";
  scopeValue?: number;
  scopeQuery?: string;
  createdBy?: string;
  fieldMappings: RuntimeFieldMappingItem[];
};

export type UpdateRuntimeEnvironmentRequest = {
  name?: string;
  description?: string;
  datasetName?: string;
  scopeType?: "LAST_N" | "FULL" | "CUSTOM";
  scopeValue?: number;
  scopeQuery?: string;
  fieldMappings?: RuntimeFieldMappingItem[];
};

export type ReplaceRuntimeMappingsRequest = {
  fieldMappings: RuntimeFieldMappingItem[];
};

const DATASETS_CACHE_TTL_MS = 3000;
let datasetsInFlight: Promise<ApiResult<RuntimeDataset[]>> | null = null;
let datasetsCache:
  | {
      at: number;
      value: ApiResult<RuntimeDataset[]>;
    }
  | null = null;

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readDatasetDocumentCount(dataset: RuntimeDatasetApi): number | null {
  const candidates = [
    dataset.documentCount,
    dataset.docCount,
    dataset.totalDocs,
    dataset.total,
    dataset.count,
  ];
  for (const candidate of candidates) {
    const value = toNullableNumber(candidate);
    if (value != null) return value;
  }
  return null;
}

async function buildErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (text) return text;
  const status = res.status ? ` (${res.status} ${res.statusText})` : "";
  return `${fallback}${status}`.trim();
}

async function requestJson<T>(
  input: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(input, init);
    if (!res.ok) {
      return {
        data: null,
        error: await buildErrorMessage(res, RUNTIME_SERVICE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: RUNTIME_SERVICE_DOWN_MESSAGE };
  }
}

function normalizeError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in (error as Record<string, unknown>)) {
    const value = (error as Record<string, unknown>).message;
    return typeof value === "string" ? value : String(value);
  }
  return "加载失败。";
}

function normalizeRuntimeError(error: unknown, fallback: string) {
  return normalizeError(error) ?? fallback;
}

function normalizeRuntimeEnvironment(item: RuntimeEnvironment): RuntimeEnvironment {
  const normalizedScopeValue =
    typeof item.scopeValue === "number"
      ? item.scopeValue
      : toNullableNumber(item.scopeValue) ?? undefined;
  return {
    ...item,
    scopeValue: normalizedScopeValue,
  };
}

export async function fetchRuntimeDatasets(): Promise<ApiResult<RuntimeDataset[]>> {
  const now = Date.now();
  if (datasetsCache && now - datasetsCache.at < DATASETS_CACHE_TTL_MS) {
    return datasetsCache.value;
  }

  if (datasetsInFlight) {
    return datasetsInFlight;
  }

  datasetsInFlight = (async () => {
  const result = await requestJson<RuntimeDatasetsApiResponse>(
    `${RUNTIME_API_PROXY}/datasets`,
    { cache: "no-store" }
  );

  if (!result.data) {
    const value = { data: null, error: result.error };
    datasetsCache = { at: Date.now(), value };
    return value;
  }

  if (!result.data.success) {
    const value = {
      data: null,
      error: normalizeError(result.data.error) ?? "无法加载文档库。",
    };
    datasetsCache = { at: Date.now(), value };
    return value;
  }

  const datasets = Array.isArray(result.data.data) ? result.data.data : [];
  const value = {
    data: datasets.map((dataset) => ({
      dataset: dataset.dataset,
      documentCount: readDatasetDocumentCount(dataset),
      fields: Array.isArray(dataset.fields)
        ? dataset.fields.map((field) => ({
            name: field.name,
            type: field.type,
            indexed: Boolean(field.indexed),
            stored: Boolean(field.stored),
            multiValued: Boolean(field.multiValued),
          }))
        : [],
    })),
    error: null,
  };
  datasetsCache = { at: Date.now(), value };
  return value;
  })();

  try {
    return await datasetsInFlight;
  } finally {
    datasetsInFlight = null;
  }
}

export async function createRuntimeEnvironment(
  payload: CreateRuntimeEnvironmentRequest
): Promise<ApiResult<RuntimeEnvironment>> {
  const result = await requestJson<RuntimeEnvironmentApiResponse>(
    `${RUNTIME_API_PROXY}/environments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "创建场景失败。"),
    };
  }
  if (!result.data.data) {
    return { data: null, error: "创建场景失败：响应缺少数据。" };
  }
  return { data: result.data.data, error: null };
}

export async function fetchRuntimeEnvironments(params?: {
  name?: string;
  keyword?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | "ALL";
}): Promise<
  ApiResult<RuntimeEnvironment[]>
> {
  const url = new URL(`${RUNTIME_API_PROXY}/environments`, "http://localhost");
  if (params?.name && params.name.trim()) {
    url.searchParams.set("name", params.name.trim());
  }
  if (params?.keyword && params.keyword.trim()) {
    url.searchParams.set("keyword", params.keyword.trim());
  }
  if (params?.status && params.status !== "ALL") {
    url.searchParams.set("status", params.status);
  }
  const result = await requestJson<RuntimeEnvironmentListApiResponse>(
    `${url.pathname}${url.search}`,
    { cache: "no-store" }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "无法加载场景列表。"),
    };
  }
  const payload = result.data.data;
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : [];
  return {
    data: (items ?? []).map(normalizeRuntimeEnvironment),
    error: null,
  };
}

export async function fetchRuntimeEnvironmentById(
  id: number | string
): Promise<ApiResult<RuntimeEnvironment>> {
  const result = await requestJson<RuntimeEnvironmentApiResponse>(
    `${RUNTIME_API_PROXY}/environments/${encodeURIComponent(String(id))}`,
    { cache: "no-store" }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "场景详情加载失败。"),
    };
  }
  if (!result.data.data) {
    return { data: null, error: "场景详情加载失败：响应缺少数据。" };
  }
  return { data: normalizeRuntimeEnvironment(result.data.data), error: null };
}

export async function updateRuntimeEnvironment(
  id: number | string,
  payload: UpdateRuntimeEnvironmentRequest
): Promise<ApiResult<RuntimeEnvironment>> {
  const result = await requestJson<RuntimeEnvironmentApiResponse>(
    `${RUNTIME_API_PROXY}/environments/${encodeURIComponent(String(id))}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "保存场景失败。"),
    };
  }
  if (!result.data.data) {
    return { data: null, error: "保存场景失败：响应缺少数据。" };
  }
  return { data: result.data.data, error: null };
}

export async function replaceRuntimeEnvironmentMappings(
  id: number | string,
  payload: ReplaceRuntimeMappingsRequest
): Promise<ApiResult<RuntimeFieldMappingItem[]>> {
  const result = await requestJson<{
    success: boolean;
    data?: RuntimeFieldMappingItem[] | null;
    error?: unknown;
  }>(`${RUNTIME_API_PROXY}/environments/${encodeURIComponent(String(id))}/mappings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "保存信息项对应关系失败。"),
    };
  }
  return {
    data: Array.isArray(result.data.data) ? result.data.data : [],
    error: null,
  };
}

export async function activateRuntimeEnvironment(
  id: number | string,
  operator = "admin"
): Promise<ApiResult<RuntimeEnvironment>> {
  const result = await requestJson<RuntimeEnvironmentApiResponse>(
    `${RUNTIME_API_PROXY}/environments/${encodeURIComponent(String(id))}/activate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator }),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeRuntimeError(result.data.error, "启用场景失败。"),
    };
  }
  if (!result.data.data) {
    return { data: null, error: "启用场景失败：响应缺少数据。" };
  }
  return { data: normalizeRuntimeEnvironment(result.data.data), error: null };
}
