"use client";

import { TopicSetDetail } from "@/lib/topicset-api";
import { t } from "@/i18n";
import { VersionSelector } from "../../components/version-selector";

export function WorkspaceHeader({
  topicSetDetail,
  version,
  versions,
  editable,
  onChangeVersion,
  onPublish,
}: {
  topicSetDetail: TopicSetDetail | null;
  version: number | null;
  versions: Array<{ version: number; status: string }>;
  editable: boolean;
  onChangeVersion: (version: number | null) => void;
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
    </section>
  );
}

