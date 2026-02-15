import { createContext, useContext } from "react";
import type { UiCapabilityViewModel } from "./types";

const CapabilityContext = createContext<UiCapabilityViewModel | null>(null);

export function CapabilityProvider({
  value,
  children,
}: {
  value: UiCapabilityViewModel;
  children: React.ReactNode;
}) {
  return <CapabilityContext.Provider value={value}>{children}</CapabilityContext.Provider>;
}

export function useCapability(): UiCapabilityViewModel {
  const capability = useContext(CapabilityContext);
  if (!capability) {
    throw new Error("CapabilityContext is missing. Wrap RuleEditor with CapabilityProvider.");
  }
  return capability;
}
