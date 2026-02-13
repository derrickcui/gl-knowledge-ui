import type { ReactNode } from "react";

export function MainWorkspace({
  treeWorkspace,
  rightSidebar,
}: {
  treeWorkspace: ReactNode;
  rightSidebar: ReactNode;
}) {
  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-w-[360px]">{treeWorkspace}</div>
      <div>{rightSidebar}</div>
    </div>
  );
}

