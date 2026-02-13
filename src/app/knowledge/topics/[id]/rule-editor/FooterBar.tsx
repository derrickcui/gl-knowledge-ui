import type { ReactNode } from "react";

export function FooterBar({
  capabilityIndicator,
  statusSummary,
}: {
  capabilityIndicator?: ReactNode;
  statusSummary: ReactNode;
}) {
  const hasCapability = Boolean(capabilityIndicator);
  return (
    <div className={hasCapability ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
      {hasCapability ? <div>{capabilityIndicator}</div> : null}
      <div>{statusSummary}</div>
    </div>
  );
}
