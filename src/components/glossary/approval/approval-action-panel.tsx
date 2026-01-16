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
        title: "正在执行审批通过操作，请稍后...",
      });
      if (!candidate.changeId) {
        throw new Error("Missing change id");
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
        title: "Approved",
        message:
          "Request closed and lifecycle updated to Published.",
      });
      setApproveOpen(false);
      router.push("/knowledge/glossary/approvals");
      router.refresh();
    } catch (e: any) {
      onFeedback({
        type: "error",
        title: "Approve failed",
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
        title: "正在执行审批拒绝操作，请稍后...",
      });
      if (!candidate.changeId) {
        throw new Error("Missing change id");
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
        title: "Rejected",
        message:
          "Request closed and lifecycle updated to Rejected.",
      });
      setRejectOpen(false);
      router.push("/knowledge/glossary/approvals");
      router.refresh();
    } catch (e: any) {
      onFeedback({
        type: "error",
        title: "Reject failed",
        message: e?.message,
      });
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-md border p-4">
      <div className="text-sm font-medium">
        Governance Action
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Assigned to you · Under Review
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-md bg-black px-3 py-1 text-sm text-white"
          onClick={() => setApproveOpen(true)}
        >
          Approve
        </button>
        <button
          className="rounded-md border px-3 py-1 text-sm"
          onClick={() => setRejectOpen(true)}
        >
          Reject
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
