"use client";

import { t } from "@/i18n";

export function VersionsPage({
  currentVersion,
  selectedVersion,
  versions,
  onView,
  onCompare,
  onRestore,
  onRollback,
}: {
  currentVersion: number | null;
  selectedVersion: number | null;
  versions: Array<{ version: number; status: string; createdAt?: string }>;
  onView: (version: number | null) => void;
  onCompare: (version: number) => void;
  onRestore: (version: number) => void;
  onRollback: (version: number) => void;
}) {
  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const statusLabel = (status: string) =>
    status?.toUpperCase().includes("DRAFT") ? t("topicSet.version.draft") : t("topicSet.version.published");

  const statusClass = (status: string) =>
    status?.toUpperCase().includes("DRAFT")
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="text-sm font-semibold">{t("topicSet.versions.title")}</h2>
      <div className="mt-3 overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t("topicSet.versions.columnVersion")}</th>
              <th className="px-3 py-2">{t("topicSet.versions.columnStatus")}</th>
              <th className="px-3 py-2">{t("topicSet.versions.columnCreatedAt")}</th>
              <th className="px-3 py-2">{t("topicSet.versions.columnActions")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className={selectedVersion == null ? "bg-muted/40" : ""}>
              <td className="px-3 py-2 font-medium">
                {t("topicSet.version.current")} ({currentVersion == null ? "-" : `v${currentVersion}`})
              </td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2">-</td>
              <td className="px-3 py-2">
                <button className="rounded border px-2 py-1 text-xs" onClick={() => onView(null)}>
                  {t("topicSet.versions.view")}
                </button>
              </td>
            </tr>
            {versions.map((item) => (
              <tr
                key={`${item.version}-${item.status}`}
                className={`border-t ${selectedVersion === item.version ? "bg-muted/40" : ""}`}
              >
                <td className="px-3 py-2 font-medium">v{item.version}</td>
                <td className="px-3 py-2">
                  <span className={`rounded border px-2 py-0.5 text-xs ${statusClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => onView(item.version)}>
                      {t("topicSet.versions.view")}
                    </button>
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => onCompare(item.version)}>
                      {t("topicSet.versions.compare")}
                    </button>
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => onRestore(item.version)}>
                      {t("topicSet.versions.restore")}
                    </button>
                    <button className="rounded border px-2 py-1 text-xs" onClick={() => onRollback(item.version)}>
                      {t("topicSet.versions.rollback")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
