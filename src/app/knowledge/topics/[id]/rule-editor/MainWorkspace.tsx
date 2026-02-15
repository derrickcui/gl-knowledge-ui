import { useRef, useState } from "react";
import type { ReactNode } from "react";

export type WorkspaceViewMode = "edit" | "validate" | "split";

export function MainWorkspace({
  treeWorkspace,
  effectValidationPanel,
  rightSidebar,
  viewMode,
  analysisCollapsed = false,
  onChangeAnalysisCollapsed,
}: {
  treeWorkspace: ReactNode;
  effectValidationPanel: ReactNode;
  rightSidebar: ReactNode;
  viewMode: WorkspaceViewMode;
  analysisCollapsed?: boolean;
  onChangeAnalysisCollapsed?: (collapsed: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [analysisHeightPercent, setAnalysisHeightPercent] = useState(40);
  const [dragging, setDragging] = useState(false);

  const editorPage = (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-h-0 min-w-[360px]">{treeWorkspace}</div>
      <div className="min-h-0">{rightSidebar}</div>
    </div>
  );

  const analysisHeight = analysisCollapsed ? 56 : analysisHeightPercent;
  const editorHeight = analysisCollapsed ? 100 : 100 - analysisHeight;

  const startResize = (startY: number) => {
    const container = containerRef.current;
    if (!container || analysisCollapsed) return;
    setDragging(true);
    const startPercent = analysisHeightPercent;
    const rect = container.getBoundingClientRect();
    const onMove = (event: MouseEvent) => {
      const deltaY = startY - event.clientY;
      const nextPercent = startPercent + (deltaY / rect.height) * 100;
      setAnalysisHeightPercent(Math.max(24, Math.min(60, nextPercent)));
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div ref={containerRef} className="h-full min-h-0">
      {viewMode === "edit" ? (
        editorPage
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0" style={{ height: `${editorHeight}%` }}>
            {editorPage}
          </div>

          <div
            className={`h-2 cursor-row-resize border-y bg-slate-100 ${dragging ? "bg-slate-200" : ""}`}
            onMouseDown={(event) => startResize(event.clientY)}
            role="separator"
            aria-orientation="horizontal"
          />

          <div className="min-h-0" style={{ height: analysisCollapsed ? "56px" : `${analysisHeight}%` }}>
            {effectValidationPanel}
          </div>
        </div>
      )}
    </div>
  );
}
