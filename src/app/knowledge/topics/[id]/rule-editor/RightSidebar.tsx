import type { ReactNode } from "react";

export function RightSidebar({
  propertyPanel,
  explainPanel,
  validationPanel,
  diffPreviewPanel,
  statusSummary,
}: {
  propertyPanel: ReactNode;
  explainPanel: ReactNode;
  validationPanel: ReactNode;
  diffPreviewPanel: ReactNode;
  statusSummary?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {propertyPanel}
      {explainPanel}
      {validationPanel}
      {diffPreviewPanel}
      {statusSummary}
    </div>
  );
}
