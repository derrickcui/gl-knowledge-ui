"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CandidateDTO,
  CandidateRelationsResponse,
  decideChange,
} from "@/lib/api";
import { ApproveDialog } from "./approve-dialog";
import { RejectDialog } from "./reject-dialog";
import { t } from "@/i18n";

const CURRENT_REVIEWER = "ui-user";

export function ApprovalActionPanel({
  candidate,
  relations,
  onFeedback,
}: {
  candidate: CandidateDTO & { changeId?: number };
  relations: CandidateRelationsResponse;
  onFeedback: (f: {
    type: "error" | "success" | "info";
    title: string;
    message?: string;
  }) => void;
}) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<
    "approve" | "reject" | null
  >(null);

  function isPublishedStatus(status: string) {
    return status === "PUBLISHED" || status === "APPROVED";
  }

  const relationStatuses = [
    ...relations.outgoing.map((item) => item.target.status),
    ...relations.incoming.map((item) => item.source.status),
  ];
  const totalRelations = relationStatuses.length;
  const inactiveRelations = relationStatuses.filter(
    (status) => !isPublishedStatus(status)
  ).length;

  async function handleApprove(reason: string) {
    try {
      setLoadingAction("approve");
      onFeedback({
        type: "info",
        title: t("glossary.approvalAction.approving"),
      });
      if (!candidate.changeId) {
        throw new Error(t("glossary.approvalAction.missingChangeId"));
      }
      const result = await decideChange({
        changeId: candidate.changeId,
        payload: {
          status: "APPROVED",
          reviewer: CURRENT_REVIEWER,
          comment: reason,
        },
      });
      if (result.error) {
        throw new Error(result.error);
      }
      onFeedback({
        type: "success",
        title: t("glossary.approvalAction.approvedTitle"),
        message: t("glossary.approvalAction.approvedMessage"),
      });
      setApproveOpen(false);
      router.push("/knowledge/glossary/approvals");
      router.refresh();
    } catch (e: any) {
      onFeedback({
        type: "error",
        title: t("glossary.approvalAction.approveFailed"),
        message: e?.message,
      });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleReject(payload: {
    reasonType: string;
    reason: string;
  }) {
    try {
      setLoadingAction("reject");
      onFeedback({
        type: "info",
        title: t("glossary.approvalAction.rejecting"),
      });
      if (!candidate.changeId) {
        throw new Error(t("glossary.approvalAction.missingChangeId"));
      }
      const result = await decideChange({
        changeId: candidate.changeId,
        payload: {
          status: "REJECTED",
          reviewer: CURRENT_REVIEWER,
          comment: `${payload.reasonType}: ${payload.reason}`,
        },
      });
      if (result.error) {
        throw new Error(result.error);
      }
      onFeedback({
        type: "success",
        title: t("glossary.approvalAction.rejectedTitle"),
        message: t("glossary.approvalAction.rejectedMessage"),
      });
      setRejectOpen(false);
      router.push("/knowledge/glossary/approvals");
      router.refresh();
    } catch (e: any) {
      onFeedback({
        type: "error",
        title: t("glossary.approvalAction.rejectFailed"),
        message: e?.message,
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-md border p-4">
      <div className="text-sm font-medium">
        {t("glossary.approvalAction.title")}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {t("glossary.approvalAction.subtitle")}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-md bg-black px-3 py-1 text-sm text-white"
          onClick={() => setApproveOpen(true)}
        >
          {t("glossary.common.approve")}
        </button>
        <button
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => setRejectOpen(true)}
        >
          {t("glossary.common.reject")}
        </button>
      </div>

      <ApproveDialog
        open={approveOpen}
        term={candidate.canonical}
        summary={{
          total: totalRelations,
          inactive: inactiveRelations,
        }}
        loading={loadingAction === "approve"}
        onCancel={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      <RejectDialog
        open={rejectOpen}
        term={candidate.canonical}
        loading={loadingAction === "reject"}
        onCancel={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />
    </div>
  );
}
