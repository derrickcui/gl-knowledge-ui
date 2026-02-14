import type { ReactNode } from "react";

export function MainWorkspace({
  treeWorkspace,
  rightSidebar,
}: {
  treeWorkspace: ReactNode;
  rightSidebar: ReactNode;
}) {
  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="min-h-0 min-w-[360px]">{treeWorkspace}</div>
      <div className="min-h-0">{rightSidebar}</div>
    </div>
  );
}
