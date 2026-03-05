import { t } from "@/i18n";

export default function ChangeDetailPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("glossary.changes.title")}</h1>
        <p className="text-sm text-slate-400">{t("glossary.changes.subtitle")}</p>
      </header>
      <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
        Change diff view is not available in this build.
      </section>
    </div>
  );
}
