import type { ReactNode } from "react";

export default function KnowledgeLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}

