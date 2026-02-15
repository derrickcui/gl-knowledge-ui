import { executeRuntimeRule } from "@/lib/api/ruleRuntime";
import type { RuntimeExecutePayload } from "@/lib/api/ruleRuntime";
import type { RuntimeExecuteResponse } from "@/lib/api/ruleRuntime";
import type { RuntimeExecuteOptions } from "@/lib/api/ruleRuntime";
import type { RuntimeMode } from "@/lib/api/ruleRuntime";
import { useRuntimeStore } from "@/store/runtimeStore";
import { useRuleExecutionStore } from "@/store/ruleExecutionStore";

export function useRuntimeExecution() {
  const runtimeId = useRuntimeStore((s) => s.activeRuntimeId);
  const setMode = useRuleExecutionStore((s) => s.setMode);
  const setLoading = useRuleExecutionStore((s) => s.setLoading);
  const setResult = useRuleExecutionStore((s) => s.setResult);
  const setError = useRuleExecutionStore((s) => s.setError);

  async function execute({
    mode,
    rule,
    nodeId,
    options,
    runtimeEnvironmentId,
  }: {
    mode: RuntimeMode;
    rule: unknown;
    nodeId?: string;
    options?: RuntimeExecuteOptions;
    runtimeEnvironmentId?: number;
  }): Promise<RuntimeExecuteResponse> {
    const resolvedRuntimeId = runtimeEnvironmentId ?? runtimeId;
    if (!resolvedRuntimeId) throw new Error("No runtime selected");

    setMode(mode);
    setLoading(true);
    setError(null);

    try {
      if (mode === "NODE" && !nodeId) {
        throw new Error("No node selected");
      }

      let payload: RuntimeExecutePayload;
      if (mode === "FULL") {
        payload = {
          mode: "FULL",
          runtimeEnvironmentId: resolvedRuntimeId,
          rule,
          options: {
            page: options?.page ?? 1,
            size: options?.size ?? 20,
            withHighlight: options?.withHighlight ?? true,
            withItems: options?.withItems ?? true,
          },
        };
      } else if (mode === "IMPACT") {
        payload = {
          mode: "IMPACT",
          runtimeEnvironmentId: resolvedRuntimeId,
          rule,
          options: { withHighlight: false, withItems: false },
        };
      } else {
        payload = {
          mode: "NODE",
          runtimeEnvironmentId: resolvedRuntimeId,
          rule,
          nodeId: nodeId as string,
          options: {
            page: options?.page ?? 1,
            size: options?.size ?? 20,
            withHighlight: options?.withHighlight ?? true,
            withItems: options?.withItems ?? true,
          },
        };
      }

      const res = await executeRuntimeRule(payload);
      setResult(res);
      return res;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Execution failed";
      setError(message);
      setResult(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function executeNode({
    rule,
    nodeId,
    options,
    runtimeEnvironmentId,
  }: {
    rule: unknown;
    nodeId: string;
    options?: RuntimeExecuteOptions;
    runtimeEnvironmentId?: number;
  }): Promise<RuntimeExecuteResponse> {
    return execute({
      mode: "NODE",
      rule,
      nodeId,
      options: {
        page: options?.page ?? 1,
        size: options?.size ?? 20,
        withHighlight: options?.withHighlight ?? true,
        withItems: options?.withItems ?? true,
      },
      runtimeEnvironmentId,
    });
  }

  return { execute, executeNode };
}
