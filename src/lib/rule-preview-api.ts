import type { ApiResult } from "@/lib/api";

const RULE_PREVIEW_API_PROXY = "/api/rules";

const RULE_PREVIEW_SERVICE_DOWN_MESSAGE =
  "rule-preview service unavailable.";
const RULE_PREVIEW_SERVICE_ERROR_MESSAGE =
  "rule-preview request failed.";

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
        error: await buildErrorMessage(res, RULE_PREVIEW_SERVICE_ERROR_MESSAGE),
      };
    }
    return { data: (await res.json()) as T, error: null };
  } catch {
    return { data: null, error: RULE_PREVIEW_SERVICE_DOWN_MESSAGE };
  }
}

export type RuntimeActiveItem = {
  id: number;
  name: string;
  datasetName: string;
  scopeLabel: string;
};

export type RulePreviewRequest = {
  ruleJson: unknown;
  runtimeEnvironmentId: number;
  limit?: number;
};

export type NodePreviewRequest = RulePreviewRequest & {
  nodeId: string;
};

export type MatchedReasonView = {
  field: string;
  label: string;
  keyword: string;
};

export type RulePreviewItem = {
  id: string;
  title: string;
  matchedReasons: MatchedReasonView[];
  highlightFragments: string[];
};

export type ConditionImpactItem = {
  nodeId: string;
  label: string;
  totalWithoutNode: number;
  contribution: number;
  contributionRate: number;
};

export type RulePreviewResponse = {
  mode: "FULL_RULE" | "NODE";
  nodeId?: string | null;
  nodeTotal?: number;
  fullRuleTotal?: number | null;
  delta?: number | null;
  impactRanking?: ConditionImpactItem[];
  total: number;
  previousTotal?: number | null;
  items: RulePreviewItem[];
};

export type PreviewDocumentDetailResponse = {
  id: string;
  title: string;
  content: string;
  matchedReasons: MatchedReasonView[];
  highlightFragments: string[];
};

export async function fetchActiveRuntimeEnvironments() {
  return requestJson<RuntimeActiveItem[]>(`/api/runtime/active`, {
    cache: "no-store",
  });
}

export async function previewRule(payload: RulePreviewRequest) {
  return requestJson<RulePreviewResponse>(`${RULE_PREVIEW_API_PROXY}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function previewRuleNode(payload: NodePreviewRequest) {
  return requestJson<RulePreviewResponse>(`${RULE_PREVIEW_API_PROXY}/preview/node`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchPreviewDocumentDetail(docId: string) {
  return requestJson<PreviewDocumentDetailResponse>(
    `${RULE_PREVIEW_API_PROXY}/preview/document/${encodeURIComponent(docId)}`,
    { cache: "no-store" }
  );
}
