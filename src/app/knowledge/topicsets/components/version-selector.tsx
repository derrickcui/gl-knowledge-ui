import { t } from "@/i18n";

type VersionSelectorProps = {
  currentVersion?: number | null;
  selectedVersion?: number | null;
  versions: Array<{ version: number; status: string }>;
  onChange: (version: number | null) => void;
};

export function VersionSelector({
  currentVersion,
  selectedVersion,
  versions,
  onChange,
}: VersionSelectorProps) {
  const value =
    selectedVersion == null ? "current" : String(selectedVersion);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t("topicSet.workspace.versionLabel")}</span>
      <select
        className="h-9 rounded-md border bg-white px-2 text-sm"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "current") {
            onChange(null);
            return;
          }
          const parsed = Number(next);
          onChange(Number.isFinite(parsed) ? parsed : null);
        }}
      >
        <option value="current">
          {t("topicSet.version.current")} ({currentVersion == null ? "-" : `v${currentVersion}`})
        </option>
        {versions.map((item) => (
          <option key={`${item.version}-${item.status}`} value={String(item.version)}>
            {item.status?.toUpperCase().includes("DRAFT")
              ? `${t("topicSet.version.draft")} v${item.version}`
              : `${t("topicSet.version.published")} v${item.version}`}
          </option>
        ))}
      </select>
    </div>
  );
}
