import ChangeDiff from "@/components/glossary/change-diff";
import PageHeader from "@/components/layout/page-header";
import { t } from "@/i18n";

export default function ChangeDetailPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("glossary.changes.title")}
        breadcrumb={[
          t("glossary.breadcrumb.knowledgeAssets"),
          t("glossary.breadcrumb.glossary"),
          t("glossary.breadcrumb.changes"),
          t("glossary.breadcrumb.detail"),
        ]}
        meta={t("glossary.changes.subtitle")}
      />
      <ChangeDiff />
    </div>
  );
}
