import { t } from "@/i18n";

type TemplateType = "policy" | "qualification" | "process" | "custom";

type AllowedModes = {
  all: boolean;
  partial: boolean;
  weighted: boolean;
};

type PositionRules = {
  any: boolean;
  paragraph: boolean;
  sentence: boolean;
  order: boolean;
  near: boolean;
};

type TemplateCreateStepsProps = {
  step: number;
  name: string;
  purpose: string;
  type: TemplateType;
  customType: string;
  allowedModes: AllowedModes;
  importanceAllowed: boolean;
  positionRules: PositionRules;
  explainPositive: string;
  explainNegative: string;
  onNameChange: (value: string) => void;
  onPurposeChange: (value: string) => void;
  onTypeChange: (value: TemplateType) => void;
  onCustomTypeChange: (value: string) => void;
  onAllowedModeChange: (key: keyof AllowedModes, value: boolean) => void;
  onImportanceAllowedChange: (value: boolean) => void;
  onPositionRuleChange: (key: keyof PositionRules, value: boolean) => void;
  onExplainPositiveChange: (value: string) => void;
  onExplainNegativeChange: (value: string) => void;
};

export function TemplateCreateSteps(props: TemplateCreateStepsProps) {
  const {
    step,
    name,
    purpose,
    type,
    customType,
    allowedModes,
    importanceAllowed,
    positionRules,
    explainPositive,
    explainNegative,
    onNameChange,
    onPurposeChange,
    onTypeChange,
    onCustomTypeChange,
    onAllowedModeChange,
    onImportanceAllowedChange,
    onPositionRuleChange,
    onExplainPositiveChange,
    onExplainNegativeChange,
  } = props;

  const templateTypeLabels: Record<TemplateType, string> = {
    policy: t("templates.create.type.policy"),
    qualification: t("templates.create.type.qualification"),
    process: t("templates.create.type.process"),
    custom: t("templates.create.type.custom"),
  };

  if (step === 0) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step1.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step1.subtitle")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step1.nameLabel")}
          </label>
          <input
            type="text"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            placeholder={t("templates.create.step1.namePlaceholder")}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step1.purposeLabel")}
          </label>
          <textarea
            className="min-h-[96px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={t("templates.create.step1.purposePlaceholder")}
            value={purpose}
            onChange={(event) => onPurposeChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step1.typeLabel")}
          </label>
          <div className="grid gap-2 md:grid-cols-2">
            {(
              ["policy", "qualification", "process", "custom"] as TemplateType[]
            ).map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="templateType"
                  checked={type === item}
                  onChange={() => onTypeChange(item)}
                />
                <span>{templateTypeLabels[item]}</span>
              </label>
            ))}
          </div>
          {type === "custom" && (
            <input
              type="text"
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder={t("templates.create.step1.customPlaceholder")}
              value={customType}
              onChange={(event) => onCustomTypeChange(event.target.value)}
            />
          )}
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step2.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step2.subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.all}
              onChange={(event) =>
                onAllowedModeChange("all", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.all.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.all.desc")}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.partial}
              onChange={(event) =>
                onAllowedModeChange("partial", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.partial.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.partial.desc")}
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border px-3 py-3 text-sm">
            <input
              type="checkbox"
              checked={allowedModes.weighted}
              onChange={(event) =>
                onAllowedModeChange("weighted", event.target.checked)
              }
            />
            <div>
              <div className="font-medium">
                {t("templates.create.step2.weighted.title")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("templates.create.step2.weighted.desc")}
              </div>
            </div>
          </label>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("templates.create.step2.hint")}
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-8">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step3.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step3.subtitle")}
          </p>
        </div>

        <div className="rounded-md border p-4">
          <div className="text-sm font-medium">
            {t("templates.create.step3.importance.title")}
          </div>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="importanceAllowed"
                checked={!importanceAllowed}
                onChange={() => onImportanceAllowedChange(false)}
              />
              <span>{t("templates.create.step3.importance.off")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="importanceAllowed"
                checked={importanceAllowed}
                onChange={() => onImportanceAllowedChange(true)}
              />
              <span>{t("templates.create.step3.importance.on")}</span>
            </label>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("templates.create.step3.importance.hint")}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <div className="text-sm font-medium">
            {t("templates.create.step3.position.title")}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
            {(
              [
                ["any", t("templates.create.step3.position.any")],
                ["paragraph", t("templates.create.step3.position.paragraph")],
                ["sentence", t("templates.create.step3.position.sentence")],
                ["order", t("templates.create.step3.position.order")],
                ["near", t("templates.create.step3.position.near")],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={positionRules[key]}
                  onChange={(event) =>
                    onPositionRuleChange(key, event.target.checked)
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {t("templates.create.step3.position.hint")}
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-base font-semibold">
            {t("templates.create.step4.title")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("templates.create.step4.subtitle")}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step4.positiveLabel")}
          </label>
          <textarea
            className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={explainPositive}
            onChange={(event) => onExplainPositiveChange(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("templates.create.step4.negativeLabel")}
          </label>
          <textarea
            className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={explainNegative}
            onChange={(event) => onExplainNegativeChange(event.target.value)}
          />
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
          {t("templates.create.step4.hint")}
        </div>
      </div>
    );
  }

  return null;
}

export type {
  AllowedModes,
  PositionRules,
  TemplateCreateStepsProps,
  TemplateType,
};
