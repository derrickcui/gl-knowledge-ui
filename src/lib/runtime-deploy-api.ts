import { ApiResult } from "@/lib/api";

const RUNTIME_DEPLOY_API_PROXY = "/api/runtime/deploy";
const RUNTIME_DEPLOYMENTS_API_PROXY = "/api/runtime/deployments";
const RUNTIME_DEPLOY_DOWN_MESSAGE = "runtime deploy service unreachable";
const RUNTIME_DEPLOY_ERROR_MESSAGE = "runtime deploy request failed";

export type RuntimeDeploymentStatus =
  | "ACTIVE"
  | "PENDING"
  | "INACTIVE"
  | "FAILED"
  | string;

export type RuntimeDeployMode =
  | "FILTER"
  | "BOOST"
  | "LABEL"
  | "MAP"
  | "SIGNAL"
  | string;

export type RuntimeDeploymentItem = {
  deploymentId: number;
  topicId: string;
  snapshotId: number | null;
  snapshotVersion: number | null;
  publishedRevision: number | null;
  runtimeEnvironmentId: number | null;
  runtimeEnvironmentName: string;
  deployedBy: string;
  engineType: string;
  datasetName: string;
  versionLabel: string;
  status: RuntimeDeploymentStatus;
  deployedAt: string | null;
  canActivate: boolean;
  canRollback: boolean;
  canDelete: boolean;
  canViewLog: boolean;
};

export type RuntimeDeployValidation = {
  passed: boolean;
  mappedFields: Array<{ source: string; target: string }>;
  missingFields: string[];
  currentActiveSnapshotId: number | null;
  message?: string;
};

export type RuntimeDeployMetrics = {
  executeCount: number | null;
  avgLatencyMs: number | null;
  cacheHitRate: number | null;
  failureCount: number | null;
};

export type RuntimeDeploymentDetail = {
  deploymentId: number;
  topicId: string;
  snapshotId: number | null;
  snapshotVersion: number | null;
  publishedRevision: number | null;
  environmentId: number | null;
  environmentName: string;
  status: string;
  deployedAt: string | null;
  deployedBy: string;
  deploymentLog: string;
};

type RuntimeDeployListResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type RuntimeDeployValidationResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type RuntimeDeployCreateResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type RuntimeDeployDetailResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type RuntimeDeployMetricsResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

function normalizeError(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return fallback;
}

function unwrapArrayPayload(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
    );
  }
  if (!data || typeof data !== "object") return [];
  const payload = data as Record<string, unknown>;
  if (Array.isArray(payload.items)) {
    return payload.items.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
    );
  }
  return [];
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
        error: await buildErrorMessage(res, RUNTIME_DEPLOY_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: RUNTIME_DEPLOY_DOWN_MESSAGE };
  }
}

function normalizeDeployment(item: Record<string, unknown>): RuntimeDeploymentItem {
  const deploymentId = toNumber(item.deploymentId) ?? toNumber(item.id) ?? 0;
  const topicId = toText(item.topicId);
  const snapshotId = toNumber(item.snapshotId) ?? toNumber(item.snapshot_id);
  const snapshotVersion = toNumber(item.snapshotVersion);
  const publishedRevision = toNumber(item.publishedRevision);
  const runtimeEnvironmentId =
    toNumber(item.runtimeEnvironmentId) ??
    toNumber(item.runtime_environment_id) ??
    toNumber(item.environmentId) ??
    toNumber(item.environment_id);
  const runtimeEnvironmentName =
    toText(item.runtimeEnvironmentName) ||
    toText(item.environmentName) ||
    toText(item.runtimeName) ||
    "-";
  const deployedBy = toText(item.deployedBy) || "-";
  const engineType =
    toText(item.engineType) || toText(item.engine) || toText(item.runtimeEngine) || "-";
  const datasetName = toText(item.datasetName) || toText(item.dataset) || "-";
  const versionRaw =
    toText(item.versionLabel) ||
    toText(item.snapshotVersion) ||
    toText(item.publishedRevision) ||
    toText(item.topicVersion) ||
    toText(item.version);
  const versionLabel = versionRaw.startsWith("v") ? versionRaw : versionRaw ? `v${versionRaw}` : "-";
  const rawStatus = toText(item.status).toUpperCase();
  const status = rawStatus === "SUCCESS" ? "ACTIVE" : rawStatus || "INACTIVE";
  const deployedAt = toText(item.deployedAt) || toText(item.createdAt) || toText(item.updatedAt) || null;

  return {
    deploymentId,
    topicId,
    snapshotId,
    snapshotVersion,
    publishedRevision,
    runtimeEnvironmentId,
    runtimeEnvironmentName,
    deployedBy,
    engineType,
    datasetName,
    versionLabel,
    status,
    deployedAt,
    canActivate: Boolean(item.canActivate),
    canRollback: Boolean(item.canRollback),
    canDelete: Boolean(item.canDelete),
    canViewLog: Boolean(item.canViewLog),
  };
}

function normalizeValidation(data: unknown): RuntimeDeployValidation {
  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const passed = Boolean(payload.passed ?? payload.valid ?? payload.ok);
  const mappingRaw = Array.isArray(payload.mappedFields)
    ? payload.mappedFields
    : Array.isArray(payload.mappings)
      ? payload.mappings
      : [];
  const mappedFields = mappingRaw
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
    )
    .map((item) => ({
      source: toText(item.source) || toText(item.from) || toText(item.logicalField),
      target: toText(item.target) || toText(item.to) || toText(item.physicalField),
    }))
    .filter((item) => item.source && item.target);
  const missingRaw = Array.isArray(payload.missingFields)
    ? payload.missingFields
    : Array.isArray(payload.unmappedFields)
      ? payload.unmappedFields
      : [];
  const missingFields = missingRaw.map((item) => toText(item)).filter(Boolean);

  return {
    passed,
    mappedFields,
    missingFields,
    currentActiveSnapshotId: toNumber(payload.currentActiveSnapshotId),
    message: toText(payload.message) || undefined,
  };
}

function normalizeDeploymentDetail(data: unknown): RuntimeDeploymentDetail {
  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return {
    deploymentId: toNumber(payload.deploymentId ?? payload.id) ?? 0,
    topicId: toText(payload.topicId),
    snapshotId: toNumber(payload.snapshotId),
    snapshotVersion: toNumber(payload.snapshotVersion),
    publishedRevision: toNumber(payload.publishedRevision),
    environmentId: toNumber(payload.environmentId),
    environmentName: toText(payload.environmentName) || "-",
    status: toText(payload.status).toUpperCase() || "UNKNOWN",
    deployedAt: toText(payload.deployedAt) || null,
    deployedBy: toText(payload.deployedBy) || "-",
    deploymentLog: toText(payload.deploymentLog) || "",
  };
}

function normalizeMetrics(data: unknown): RuntimeDeployMetrics {
  const payload =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const counters =
    payload.counters && typeof payload.counters === "object"
      ? (payload.counters as Record<string, unknown>)
      : {};
  const avgDurationMs =
    payload.avgDurationMs && typeof payload.avgDurationMs === "object"
      ? (payload.avgDurationMs as Record<string, unknown>)
      : {};
  return {
    executeCount: toNumber(payload.executeCount ?? payload.executions ?? counters.executeCount),
    avgLatencyMs: toNumber(payload.avgLatencyMs ?? payload.avgLatency ?? avgDurationMs.execute),
    cacheHitRate: toNumber(payload.cacheHitRate ?? payload.cacheHit ?? counters.cacheHitRate),
    failureCount: toNumber(payload.failureCount ?? payload.failures ?? counters.failureCount),
  };
}

export async function fetchRuntimeDeployments(topicId: string): Promise<ApiResult<RuntimeDeploymentItem[]>> {
  const url = new URL(RUNTIME_DEPLOYMENTS_API_PROXY, "http://localhost");
  url.searchParams.set("topicId", topicId);
  const result = await requestJson<RuntimeDeployListResponse>(
    `${url.pathname}${url.search}`,
    { cache: "no-store" }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeError(result.data.error, "failed to load deployments"),
    };
  }
  const items = unwrapArrayPayload(result.data.data).map(normalizeDeployment);
  items.sort((a, b) => {
    const ta = a.deployedAt ? new Date(a.deployedAt).getTime() : 0;
    const tb = b.deployedAt ? new Date(b.deployedAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return b.deploymentId - a.deploymentId;
  });
  return { data: items, error: null };
}

export async function validateRuntimeDeploy(payload: {
  topicId: string;
  environmentId: number;
}): Promise<ApiResult<RuntimeDeployValidation>> {
  const result = await requestJson<RuntimeDeployValidationResponse>(
    `${RUNTIME_DEPLOY_API_PROXY}/validate`,
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
      error: normalizeError(result.data.error, "deployment validation failed"),
    };
  }
  return { data: normalizeValidation(result.data.data), error: null };
}

export async function createRuntimeDeploy(payload: {
  topicId: string;
  environmentId: number;
  activate: boolean;
  verifyExecution?: boolean;
  operator?: string;
  deployMode?: RuntimeDeployMode | RuntimeDeployMode[];
  weight?: number;
  namespace?: string;
}): Promise<
  ApiResult<{
    deploymentId: number;
    snapshotId: number | null;
    status: RuntimeDeploymentStatus;
  }>
> {
  const result = await requestJson<RuntimeDeployCreateResponse>(
    RUNTIME_DEPLOY_API_PROXY,
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
      error: normalizeError(result.data.error, "deployment create failed"),
    };
  }
  const payloadData =
    result.data.data && typeof result.data.data === "object"
      ? (result.data.data as Record<string, unknown>)
      : {};
  return {
    data: {
      deploymentId: toNumber(payloadData.deploymentId ?? payloadData.id) ?? 0,
      snapshotId: toNumber(payloadData.snapshotId ?? payloadData.snapshot_id),
      status: toText(payloadData.status).toUpperCase() || "PENDING",
    },
    error: null,
  };
}

export async function activateRuntimeDeployment(
  deploymentId: number,
  options?: {
    verifyExecution?: boolean;
    operator?: string;
  }
): Promise<ApiResult<null>> {
  const result = await requestJson<{ success: boolean; error?: unknown }>(
    `${RUNTIME_DEPLOY_API_PROXY}/${deploymentId}/activate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operator: options?.operator ?? "systemUser",
        verifyExecution: options?.verifyExecution,
      }),
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeError(result.data.error, "activate deployment failed"),
    };
  }
  return { data: null, error: null };
}

export async function deleteRuntimeDeployment(
  deploymentId: number
): Promise<ApiResult<null>> {
  const result = await requestJson<{ success: boolean; error?: unknown }>(
    `${RUNTIME_DEPLOYMENTS_API_PROXY}/${deploymentId}`,
    {
      method: "DELETE",
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeError(result.data.error, "delete deployment failed"),
    };
  }
  return { data: null, error: null };
}

export async function fetchRuntimeDeploymentDetail(
  deploymentId: number
): Promise<ApiResult<RuntimeDeploymentDetail>> {
  const result = await requestJson<RuntimeDeployDetailResponse>(
    `${RUNTIME_DEPLOYMENTS_API_PROXY}/${deploymentId}`,
    {
      cache: "no-store",
    }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeError(result.data.error, "failed to load deployment detail"),
    };
  }
  return { data: normalizeDeploymentDetail(result.data.data), error: null };
}

export async function fetchRuntimeDeployMetrics(
  topicId?: string
): Promise<ApiResult<RuntimeDeployMetrics>> {
  const url = new URL(`${RUNTIME_DEPLOY_API_PROXY}/metrics`, "http://localhost");
  if (topicId) url.searchParams.set("topicId", topicId);
  const result = await requestJson<RuntimeDeployMetricsResponse>(
    `${url.pathname}${url.search}`,
    { cache: "no-store" }
  );
  if (!result.data) return { data: null, error: result.error };
  if (!result.data.success) {
    return {
      data: null,
      error: normalizeError(result.data.error, "failed to load deployment metrics"),
    };
  }
  return { data: normalizeMetrics(result.data.data), error: null };
}
