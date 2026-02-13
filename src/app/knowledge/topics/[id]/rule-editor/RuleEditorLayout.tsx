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
    <div className="space-y-4">
      <div>{header}</div>
      <div>{workspace}</div>
      <div>{footer}</div>
      {modals}
    </div>
  );
}

