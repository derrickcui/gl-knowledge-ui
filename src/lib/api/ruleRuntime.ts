export type RuntimeMode = "FULL" | "NODE" | "IMPACT";

export type RuntimeExecuteOptions = {
  page?: number;
  size?: number;
  withHighlight?: boolean;
  withItems?: boolean;
};

export type RuntimeExecuteImpactOptions = {
  withHighlight?: false;
  withItems?: false;
};

export type RuntimeMatchedReason = {
  field: string;
  label: string;
  displayText?: string;
  matchedTerms?: string[];
};

export type RuntimeExecuteItem = {
  id: string;
  title: string;
  matchedReasons: RuntimeMatchedReason[];
  highlightFragments: string[];
};

export type RuntimeExecuteMetadata = {
  engineVersion: string;
  executionId: string;
};

export type RuntimeImpactCondition = {
  nodeId: string;
  label: string;
  removedTotal: number;
  contribution: number;
  impactLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
};

export type RuntimeExecuteFullResponse = {
  mode: "FULL";
  runtimeEnvironmentId: number;
  total: number;
  page: number;
  size: number;
  took: number;
  items: RuntimeExecuteItem[];
  metadata: RuntimeExecuteMetadata;
};

export type RuntimeExecuteNodeResponse = {
  mode: "NODE";
  runtimeEnvironmentId: number;
  nodeId: string;
  nodeTotal: number;
  fullTotal: number;
  delta: number;
  page: number;
  size: number;
  took: number;
  items: RuntimeExecuteItem[];
  metadata: RuntimeExecuteMetadata;
};

export type RuntimeExecuteImpactResponse = {
  mode: "IMPACT";
  runtimeEnvironmentId: number;
  fullTotal: number;
  conditionCount: number;
  analysis: RuntimeImpactCondition[];
  took: number;
  metadata: RuntimeExecuteMetadata;
};

export type RuntimeExecuteResponse =
  | RuntimeExecuteFullResponse
  | RuntimeExecuteNodeResponse
  | RuntimeExecuteImpactResponse;

export type RuntimeExecutePayload =
  | {
      mode: "FULL";
      runtimeEnvironmentId: number;
      rule: unknown;
      options?: RuntimeExecuteOptions;
    }
  | {
      mode: "NODE";
      runtimeEnvironmentId: number;
      rule: unknown;
      nodeId: string;
      options?: RuntimeExecuteOptions;
    }
  | {
      mode: "IMPACT";
      runtimeEnvironmentId: number;
      rule: unknown;
      options?: RuntimeExecuteImpactOptions;
    };

export async function executeRuntimeRule(payload: RuntimeExecutePayload) {
  const res = await fetch("/api/rules/runtime/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || "Execution failed");
  }

  return (await res.json()) as RuntimeExecuteResponse;
}
