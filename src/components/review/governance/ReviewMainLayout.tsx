import type { ReactNode } from "react";

type ReviewMainLayoutProps = {
  left: ReactNode;
  right: ReactNode;
};

export function ReviewMainLayout({ left, right }: ReviewMainLayoutProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
      <div className="space-y-4">{left}</div>
      <div className="space-y-4">{right}</div>
    </div>
  );
}

export function LeftPanel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function RightPanel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
