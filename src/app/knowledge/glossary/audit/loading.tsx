import { t } from "@/i18n";

export default function Loading() {
  return (
    <div className="p-6 text-sm text-muted-foreground">
      {t("glossary.audit.loading")}
    </div>
  );
}
