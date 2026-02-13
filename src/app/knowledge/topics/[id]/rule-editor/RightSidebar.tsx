import type { ReactNode } from "react";

export function RightSidebar({
  propertyPanel,
  explainPanel,
  validationPanel,
  diffPreviewPanel,
}: {
  propertyPanel: ReactNode;
  explainPanel: ReactNode;
  validationPanel: ReactNode;
  diffPreviewPanel: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {propertyPanel}
      {explainPanel}
      {validationPanel}
      {diffPreviewPanel}
    </div>
  );
}

