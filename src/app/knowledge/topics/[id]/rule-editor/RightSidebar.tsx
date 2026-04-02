import type { ReactNode } from "react";

export function RightSidebar({
  propertyPanel,
  explainPanel,
  aiPanel,
  validationPanel,
  intelligencePanel,
  invocationPanel,
  versionTimelinePanel,
  diffPreviewPanel,
  statusSummary,
}: {
  propertyPanel: ReactNode;
  explainPanel: ReactNode;
  aiPanel?: ReactNode;
  validationPanel: ReactNode;
  intelligencePanel?: ReactNode;
  invocationPanel?: ReactNode;
  versionTimelinePanel?: ReactNode;
  diffPreviewPanel: ReactNode;
  statusSummary?: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {propertyPanel}
      {explainPanel}
      {aiPanel}
      {validationPanel}
      {intelligencePanel}
      {invocationPanel}
      {versionTimelinePanel}
      {diffPreviewPanel}
      {statusSummary}
    </div>
  );
}
