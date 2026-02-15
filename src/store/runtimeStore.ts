import { create } from "zustand";

type RuntimeState = {
  activeRuntimeId: number | null;
  setActiveRuntime: (id: number) => void;
};

export const useRuntimeStore = create<RuntimeState>((set) => ({
  activeRuntimeId: null,
  setActiveRuntime: (id) => set({ activeRuntimeId: id }),
}));
