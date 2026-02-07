import { t } from "@/i18n";

export function AuditEmptyState() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      {t("glossary.audit.empty")}
    </div>
  );
}
