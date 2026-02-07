import { CandidateDTO } from "@/lib/api";
import { t } from "@/i18n";

export function CandidateTermEditor({
  draft,
  readonly,
  onChange,
}: {
  draft: CandidateDTO;
  readonly: boolean;
  onChange: (next: CandidateDTO) => void;
}) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <h2 className="font-medium">
        {t("glossary.candidates.editor.title")}
      </h2>

      <div>
        <label className="text-sm">
          {t("glossary.candidates.editor.canonical")}
        </label>
        <input
          className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
          value={draft.canonical}
          disabled={readonly}
          onChange={(e) =>
            onChange({ ...draft, canonical: e.target.value })
          }
        />
      </div>

      <div>
        <label className="text-sm">
          {t("glossary.candidates.editor.aliases")}
        </label>
        <input
          className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
          placeholder={t("glossary.candidates.editor.aliasesPlaceholder")}
          value={draft.aliases.join(", ")}
          disabled={readonly}
          onChange={(e) =>
            onChange({
              ...draft,
              aliases: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <div className="mt-1 text-xs opacity-60">
          {t("glossary.candidates.editor.aliasesHint")}
        </div>
      </div>

      <div>
        <label className="text-sm">
          {t("glossary.candidates.editor.definition")}
        </label>
        <textarea
          className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
          rows={3}
          value={draft.definition ?? ""}
          disabled={readonly}
          onChange={(e) =>
            onChange({
              ...draft,
              definition: e.target.value,
            })
          }
        />
      </div>
    </div>
  );
}
