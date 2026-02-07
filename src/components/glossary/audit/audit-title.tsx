import { t } from "@/i18n";

export function AuditTitle() {
  return (
    <div>
      <h1 className="text-lg font-semibold">{t("glossary.audit.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("glossary.audit.subtitle")}
      </p>
    </div>
  );
}
