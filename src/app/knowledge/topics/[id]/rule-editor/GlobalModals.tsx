import type { ReactNode } from "react";

export function GlobalModals({
  termSelectorModal,
  topicReferenceModal,
  confirmDialog,
  diffDetailDrawer,
}: {
  termSelectorModal?: ReactNode;
  topicReferenceModal?: ReactNode;
  confirmDialog?: ReactNode;
  diffDetailDrawer?: ReactNode;
}) {
  return (
    <>
      {termSelectorModal}
      {topicReferenceModal}
      {confirmDialog}
      {diffDetailDrawer}
    </>
  );
}

