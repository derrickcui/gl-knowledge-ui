import { create } from "zustand";

type DrawerState = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

export const useDrawerStore = create<DrawerState>((set) => ({
  collapsed: false,
  toggle: () => set((s) => ({ collapsed: !s.collapsed })),
  setCollapsed: (v) => set({ collapsed: v })
}));
