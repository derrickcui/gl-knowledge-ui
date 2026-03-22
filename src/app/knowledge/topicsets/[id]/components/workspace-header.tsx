"use client";

import Link from "next/link";
import { TopicSetDetail } from "@/lib/topicset-api";
import { t } from "@/i18n";
import { VersionSelector } from "../../components/version-selector";

type LifecycleStatus = "DRAFT" | "REVIEW" | "APPROVED" | "PUBLISHED" | "DEPRECATED" | "ARCHIVED";

const LIFECYCLE_ORDER: LifecycleStatus[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "DEPRECATED",
  "ARCHIVED",
];

function lifecycleLabel(status: LifecycleStatus) {
  return t(`topicSet.lifecycle.status.${status.toLowerCase()}` as Parameters<typeof t>[0]);
}

export function WorkspaceHeader({
  topicSetDetail,
  version,
  versions,
  editable,
  lifecycleStatus,
  canSubmitReview,
  canApprove,
  canReject,
  canPublish,
  canCreateVersion,
  canDeprecate,
  canArchive,
  taggingLoading,
  diffSummary,
  diffBaselineVersion,
  onChangeVersion,
  onViewDiff,
  onViewVersions,
  onSubmitReview,
  onApprove,
  onReject,
  onPublish,
  onCreateVersion,
  onDeprecate,
  onArchive,
  onRunTagging,
}: {
  topicSetDetail: TopicSetDetail | null;
  version: number | null;
  versions: Array<{ version: number; status: string }>;
  editable: boolean;
  lifecycleStatus: LifecycleStatus;
  canSubmitReview: boolean;
  canApprove: boolean;
  canReject: boolean;
  canPublish: boolean;
  canCreateVersion: boolean;
  canDeprecate: boolean;
  canArchive: boolean;
  taggingLoading?: boolean;
  diffSummary?: {
    nodesAdded: number;
    nodesRemoved: number;
    nodesMoved: number;
    nodesUpdated: number;
    topicBindingsChanged: number;
  } | null;
  diffBaselineVersion?: number | null;
  onChangeVersion: (version: number | null) => void;
  onViewDiff: () => void;
  onViewVersions: () => void;
  onSubmitReview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onPublish: () => void;
  onCreateVersion: () => void;
  onDeprecate: () => void;
  onArchive: () => void;
  onRunTagging: () => void;
}) {
  const activeVersionLabel = !topicSetDetail
    ? "-"
    : version == null || version === topicSetDetail.version
    ? `${t("topicSet.version.draft")} v${topicSetDetail.version}`
    : `${t("topicSet.version.published")} v${version}`;

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="space-y-2">
          <Link
            href="/knowledge/topicsets"
            className="inline-flex rounded border px-2 py-1 text-xs hover:bg-slate-50"
          >
            {t("topicSet.workspace.back")}
          </Link>
          <div className="text-sm">
            <span className="text-muted-foreground">{t("topicSet.workspace.topicSet")}: </span>
            <span className="font-medium">{topicSetDetail?.name ?? "-"}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-700">
              {t("topicSet.workspace.statusLabel")}: {lifecycleLabel(lifecycleStatus)}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-600">
              {t("topicSet.workspace.versionLabel")}: {activeVersionLabel}
            </span>
            {!editable && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
                {t("topicSet.workspace.viewMode")}
              </span>
            )}
          </div>
        </div>

        <VersionSelector
          currentVersion={topicSetDetail?.version}
          selectedVersion={version}
          versions={versions}
          onChange={onChangeVersion}
        />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onViewVersions}>
            {t("topicSet.workspace.viewVersions")}
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 disabled:opacity-50"
            onClick={onRunTagging}
            disabled={!topicSetDetail || taggingLoading}
          >
            {taggingLoading
              ? t("topicSet.workspace.runTaggingStarting")
              : t("topicSet.workspace.runTagging")}
          </button>
          {canSubmitReview && (
            <button
              type="button"
              className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm text-sky-700"
              onClick={onSubmitReview}
            >
              {t("topicSet.workspace.submitReview")}
            </button>
          )}
          {canReject && (
            <button
              type="button"
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-sm text-rose-700"
              onClick={onReject}
            >
              {t("topicSet.lifecycle.reject")}
            </button>
          )}
          {canApprove && (
            <button
              type="button"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
              onClick={onApprove}
            >
              {t("topicSet.lifecycle.approve")}
            </button>
          )}
          {canPublish && (
            <button
              type="button"
              className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40"
              onClick={onPublish}
              disabled={!topicSetDetail}
            >
              {t("topicSet.workspace.publish")}
            </button>
          )}
          {canCreateVersion && (
            <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onCreateVersion}>
              {t("topicSet.lifecycle.createVersion")}
            </button>
          )}
          {canDeprecate && (
            <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onDeprecate}>
              {t("topicSet.lifecycle.deprecate")}
            </button>
          )}
          {canArchive && (
            <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onArchive}>
              {t("topicSet.lifecycle.archive")}
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {LIFECYCLE_ORDER.map((item, index) => {
          const activeIndex = LIFECYCLE_ORDER.indexOf(lifecycleStatus);
          const state =
            index < activeIndex ? "done" : index === activeIndex ? "active" : "idle";
          const className =
            state === "done"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : state === "active"
              ? "border-black bg-black text-white"
              : "border-slate-200 bg-white text-slate-500";
          return (
            <span key={item} className={`rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
              {lifecycleLabel(item)}
            </span>
          );
        })}
      </div>
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2 text-xs">
          <span className="font-medium text-slate-700">{t("topicSet.workspace.changes")}</span>
          {diffSummary ? (
            <>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800">
                {t("topicSet.diff.summary.added")}: {diffSummary.nodesAdded}
              </span>
              <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">
                {t("topicSet.diff.summary.removed")}: {diffSummary.nodesRemoved}
              </span>
              <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-800">
                {t("topicSet.diff.summary.moved")}: {diffSummary.nodesMoved}
              </span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">
                {t("topicSet.diff.summary.topicChanged")}: {diffSummary.topicBindingsChanged}
              </span>
              <button
                type="button"
                className="ml-auto rounded border bg-white px-2 py-1"
                onClick={onViewDiff}
              >
                {diffBaselineVersion != null
                  ? t("topicSet.workspace.viewDiff", {
                      from: `v${diffBaselineVersion}`,
                      to: `v${topicSetDetail?.version ?? "-"}`
                    })
                  : t("topicSet.workspace.viewDiffFallback")}
              </button>
            </>
          ) : (
            <span className="text-muted-foreground">{t("topicSet.publish.noBaseline")}</span>
          )}
        </div>
      )}
    </section>
  );
}
