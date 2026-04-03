"use client";

import { t } from "@/i18n";

export function AIGenerateStructureModal({
  open,
  groups,
  applying = false,
  onClose,
  onApply,
  onCompare,
}: {
  open: boolean;
  groups: Array<{ title: string; items: string[] }>;
  applying?: boolean;
  onClose: () => void;
  onApply: () => void;
  onCompare: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{t("topicSet.ai.generateStructure")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("topicSet.ai.treeSuggestionPending")}</p>
          </div>
          <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={onClose}>
            {t("common.cancel")}
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {groups.map((group) => (
            <section key={group.title} className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/60 p-4">
              <div className="font-medium text-slate-900">{group.title}</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item}`}>- {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <button type="button" className="rounded-md border bg-white px-3 py-1.5 text-sm" onClick={onCompare}>
            {t("topicSet.ai.compareCurrent")}
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
            onClick={onApply}
            disabled={applying}
          >
            {applying ? t("common.loading") : t("topicSet.ai.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
