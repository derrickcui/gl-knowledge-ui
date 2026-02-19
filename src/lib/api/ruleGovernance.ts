type ApiError = {
  code?: string;
  message?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data?: T | null;
  error?: ApiError | null;
};

type RuntimeExecuteMetadata = {
  engineVersion: string;
  executionId: string;
};

export type RuleAnalyzeResponse = {
  depth: number;
  clauseCount: number;
  logicCount: number;
  operatorCount: number;
  proximityCount: number;
  logicDensity: number;
  complexityScore: number;
};

export type RuleVersionListItem = {
  version: number;
  createdBy?: string | null;
  createdAt: string;
};

export type RuleVersionResponse = {
  id: string;
  version: number;
  rule: unknown;
  createdBy?: string | null;
  createdAt: string;
};

export type RuleDiffModifiedNode = {
  path: string;
  before: string;
  after: string;
};

export type RuleDiffResponse = {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: RuleDiffModifiedNode[];
};

export type RuleRuntimeExecuteAnalysisResponse = {
  mode: "ANALYSIS";
  runtimeEnvironmentId: number;
  datasetTotal: number;
  ruleHit: number;
  hitRate: number;
  termStats: Array<{
    termId: string;
    nodeId?: string | null;
    hitCount: number;
    hitRate: number;
  }>;
  nodeStats: Array<{
    nodeId?: string | null;
    nodeType: string;
    hitCount: number;
    contribution: number;
  }>;
  distribution: Record<string, number>;
  took: number;
  metadata: RuntimeExecuteMetadata;
};

export type RuleRuntimeCompareResponse = {
  mode: "COMPARE";
  runtimeEnvironmentId: number;
  ruleAHit: number;
  ruleBHit: number;
  overlap: number;
  onlyA: number;
  onlyB: number;
  took: number;
  metadata: RuntimeExecuteMetadata;
};

export type RuleRuntimeSuggestResponse = {
  mode: "SUGGEST";
  runtimeEnvironmentId: number;
  suggestions: Array<{
    type: string;
    nodeId?: string | null;
    termId?: string | null;
    message: string;
    score: number;
  }>;
  took: number;
  metadata: RuntimeExecuteMetadata;
};

export type RuleRuntimeRiskResponse = {
  mode: "RISK";
  runtimeEnvironmentId: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskScore: number;
  riskFactors: string[];
  clauseCount: number;
  maxDepth: number;
  complexityScore: number;
  hitRate: number;
  executeTime: number;
  took: number;
  metadata: RuntimeExecuteMetadata;
};

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new Error(body.message || body.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>): T {
  if (!payload.success || payload.data == null) {
    throw new Error(payload.error?.message || "Request failed");
  }
  return payload.data;
}

export async function analyzeRule(rule: unknown): Promise<RuleAnalyzeResponse> {
  const payload = await requestJson<ApiEnvelope<RuleAnalyzeResponse>>("/api/rules/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule_json: rule }),
  });
  return unwrapEnvelope(payload);
}

export async function listRuleVersions(ruleId: string): Promise<RuleVersionListItem[]> {
  const payload = await requestJson<ApiEnvelope<RuleVersionListItem[]>>(
    `/api/rules/${encodeURIComponent(ruleId)}/versions`,
    { cache: "no-store" }
  );
  return unwrapEnvelope(payload);
}

export async function getRuleVersion(ruleId: string, version: number): Promise<RuleVersionResponse> {
  const payload = await requestJson<ApiEnvelope<RuleVersionResponse>>(
    `/api/rules/${encodeURIComponent(ruleId)}/version/${encodeURIComponent(String(version))}`,
    { cache: "no-store" }
  );
  return unwrapEnvelope(payload);
}

export async function diffRuleVersions(ruleId: string, from: number, to: number): Promise<RuleDiffResponse> {
  const url = new URL(`/api/rules/${encodeURIComponent(ruleId)}/diff`, "http://localhost");
  url.searchParams.set("from", String(from));
  url.searchParams.set("to", String(to));
  const payload = await requestJson<ApiEnvelope<RuleDiffResponse>>(`${url.pathname}${url.search}`, {
    cache: "no-store",
  });
  return unwrapEnvelope(payload);
}

export async function executeRuntimeRuleAnalysis(payload: {
  runtimeEnvironmentId: number;
  rule: unknown;
  options?: { bucketSizePercent?: number };
}): Promise<RuleRuntimeExecuteAnalysisResponse> {
  return requestJson<RuleRuntimeExecuteAnalysisResponse>("/api/rules/runtime/execute/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function compareRuntimeRules(payload: {
  runtimeEnvironmentId: number;
  ruleA: unknown;
  ruleB: unknown;
}): Promise<RuleRuntimeCompareResponse> {
  return requestJson<RuleRuntimeCompareResponse>("/api/rules/runtime/compare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function suggestRuntimeRule(payload: {
  runtimeEnvironmentId: number;
  rule: unknown;
  options?: { lowContributionThreshold?: number; maxSuggestions?: number };
}): Promise<RuleRuntimeSuggestResponse> {
  return requestJson<RuleRuntimeSuggestResponse>("/api/rules/runtime/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function evaluateRuntimeRuleRisk(payload: {
  runtimeEnvironmentId: number;
  rule: unknown;
  options?: { slowExecutionMs?: number };
}): Promise<RuleRuntimeRiskResponse> {
  return requestJson<RuleRuntimeRiskResponse>("/api/rules/runtime/risk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
