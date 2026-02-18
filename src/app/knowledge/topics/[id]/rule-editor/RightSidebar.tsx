import type { ReactNode } from "react";

export function RightSidebar({
  propertyPanel,
  explainPanel,
  validationPanel,
  intelligencePanel,
  versionTimelinePanel,
  diffPreviewPanel,
  statusSummary,
}: {
  propertyPanel: ReactNode;
  explainPanel: ReactNode;
  validationPanel: ReactNode;
  intelligencePanel?: ReactNode;
  versionTimelinePanel?: ReactNode;
  diffPreviewPanel: ReactNode;
  statusSummary?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {propertyPanel}
      {explainPanel}
      {validationPanel}
      {intelligencePanel}
      {versionTimelinePanel}
      {diffPreviewPanel}
      {statusSummary}
    </div>
  );
}
