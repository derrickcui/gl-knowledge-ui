import { create } from "zustand";
import type { RuntimeExecuteResponse } from "@/lib/api/ruleRuntime";

type ExecutionMode = "FULL" | "NODE" | "IMPACT";

type ExecutionState = {
  mode: ExecutionMode;
  loading: boolean;
  result: RuntimeExecuteResponse | null;
  error: string | null;
  setMode: (m: ExecutionMode) => void;
  setLoading: (b: boolean) => void;
  setResult: (r: RuntimeExecuteResponse | null) => void;
  setError: (e: string | null) => void;
};

export const useRuleExecutionStore = create<ExecutionState>((set) => ({
  mode: "FULL",
  loading: false,
  result: null,
  error: null,
  setMode: (m) => set({ mode: m }),
  setLoading: (b) => set({ loading: b }),
  setResult: (r) => set({ result: r }),
  setError: (e) => set({ error: e }),
}));
