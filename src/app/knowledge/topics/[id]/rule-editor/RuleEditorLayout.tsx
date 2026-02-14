import type { ReactNode } from "react";

export function RuleEditorLayout({
  header,
  workspace,
  footer,
  modals,
}: {
  header: ReactNode;
  workspace: ReactNode;
  footer: ReactNode;
  modals?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>{header}</div>
      <div className="min-h-0 flex-1">{workspace}</div>
      <div>{footer}</div>
      {modals}
    </div>
  );
}
