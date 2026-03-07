"use client";

import { TopicSetDetail } from "@/lib/topicset-api";
import { t } from "@/i18n";
import { VersionSelector } from "../../components/version-selector";

export function WorkspaceHeader({
  topicSetDetail,
  version,
  versions,
  editable,
  diffSummary,
  diffBaselineVersion,
  onChangeVersion,
  onViewDiff,
  onPublish,
}: {
  topicSetDetail: TopicSetDetail | null;
  version: number | null;
  versions: Array<{ version: number; status: string }>;
  editable: boolean;
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
  onPublish: () => void;
}) {
  const activeVersionLabel = !topicSetDetail
    ? "-"
    : version == null || version === topicSetDetail.version
    ? `${t("topicSet.version.draft")} v${topicSetDetail.version}`
    : `${t("topicSet.version.published")} v${version}`;

  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">{t("topicSet.workspace.topicSet")}: </span>
          <span className="font-medium">{topicSetDetail?.name ?? "-"}</span>
        </div>

        <VersionSelector
          currentVersion={topicSetDetail?.version}
          selectedVersion={version}
          versions={versions}
          onChange={onChangeVersion}
        />

        <button
          type="button"
          className="ml-auto rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-40"
          onClick={onPublish}
          disabled={!editable || !topicSetDetail}
        >
          {t("topicSet.workspace.publish")}
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {t("topicSet.workspace.versionLabel")}: {activeVersionLabel}{" "}
        {editable ? "" : `(${t("topicSet.workspace.viewMode")})`}
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
