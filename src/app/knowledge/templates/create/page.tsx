"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";

type TemplateType = "policy" | "qualification" | "process" | "custom";

export default function TemplateCreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState<TemplateType>("policy");
  const [customType, setCustomType] = useState("");
  const [allowedModes, setAllowedModes] = useState({
    all: true,
    partial: false,
    weighted: false,
  });
  const [importanceAllowed, setImportanceAllowed] = useState(false);
  const [positionRules, setPositionRules] = useState({
    any: true,
    paragraph: false,
    sentence: false,
    order: false,
    near: false,
  });
  const explainPositiveDefault = useMemo(() => {
    const value = t("templates.create.explain.positiveDefault");
    return value === "templates.create.explain.positiveDefault"
      ? "当文档中【满足以下条件】时，\n我们认为该文档属于【________】。"
      : value;
  }, []);
  const explainNegativeDefault = useMemo(() => {
    const value = t("templates.create.explain.negativeDefault");
    return value === "templates.create.explain.negativeDefault"
      ? "当未满足最低条件时，\n该文档不属于【________】。"
      : value;
  }, []);
  const [explainPositive, setExplainPositive] = useState(
    explainPositiveDefault
  );
  const [explainNegative, setExplainNegative] = useState(
    explainNegativeDefault
  );
  const [created, setCreated] = useState(false);

  useEffect(() => {
    if (explainPositive === "templates.create.explain.positiveDefault") {
      setExplainPositive(explainPositiveDefault);
    }
  }, [explainPositive, explainPositiveDefault]);

  useEffect(() => {
    if (explainNegative === "templates.create.explain.negativeDefault") {
      setExplainNegative(explainNegativeDefault);
    }
  }, [explainNegative, explainNegativeDefault]);

  const stepLabels = useMemo(
    () => [
      t("templates.create.steps.basic"),
      t("templates.create.steps.mode"),
      t("templates.create.steps.advanced"),
      t("templates.create.steps.explain"),
    ],
    []
  );

  const templateTypeLabels: Record<TemplateType, string> = useMemo(
    () => ({
      policy: t("templates.create.type.policy"),
      qualification: t("templates.create.type.qualification"),
      process: t("templates.create.type.process"),
      custom: t("templates.create.type.custom"),
    }),
    []
  );

  const canNext = useMemo(() => {
    if (step === 0) {
      return name.trim().length > 0 && purpose.trim().length > 0;
    }
    if (step === 1) {
      return (
        allowedModes.all || allowedModes.partial || allowedModes.weighted
      );
    }
    if (step === 3) {
      return explainPositive.trim().length > 0;
    }
    return true;
  }, [
    step,
    name,
    purpose,
    allowedModes.all,
    allowedModes.partial,
    allowedModes.weighted,
    explainPositive,
  ]);

  function handleNext() {
    setStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function handleCreate() {
    setCreated(true);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {t("templates.create.title")}
          </h1>
          <p className="text-sm opacity-70">
            {t("templates.create.subtitle")}
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => router.push("/knowledge/templates")}
        >
          {t("templates.create.back")}
        </button>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
          {stepLabels.map((label, index) => (
            <div
              key={label}
              className={[
                "flex items-center gap-2 rounded-full px-3 py-1",
                index === step
                  ? "bg-black text-white"
                  : index < step
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span>{index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        {step === 0 && (
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
                onChange={(event) => setName(event.target.value)}
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
                onChange={(event) => setPurpose(event.target.value)}
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
                      onChange={() => setType(item)}
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
                  onChange={(event) => setCustomType(event.target.value)}
                />
              )}
            </div>
          </div>
        )}

        {step === 1 && (
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
                    setAllowedModes((prev) => ({
                      ...prev,
                      all: event.target.checked,
                    }))
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
                    setAllowedModes((prev) => ({
                      ...prev,
                      partial: event.target.checked,
                    }))
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
                    setAllowedModes((prev) => ({
                      ...prev,
                      weighted: event.target.checked,
                    }))
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
        )}

        {step === 2 && (
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
                    onChange={() => setImportanceAllowed(false)}
                  />
                  <span>{t("templates.create.step3.importance.off")}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importanceAllowed"
                    checked={importanceAllowed}
                    onChange={() => setImportanceAllowed(true)}
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
                {[
                  ["any", t("templates.create.step3.position.any")],
                  ["paragraph", t("templates.create.step3.position.paragraph")],
                  ["sentence", t("templates.create.step3.position.sentence")],
                  ["order", t("templates.create.step3.position.order")],
                  ["near", t("templates.create.step3.position.near")],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={positionRules[key as keyof typeof positionRules]}
                      onChange={(event) =>
                        setPositionRules((prev) => ({
                          ...prev,
                          [key]: event.target.checked,
                        }))
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
        )}

        {step === 3 && (
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
                onChange={(event) => setExplainPositive(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("templates.create.step4.negativeLabel")}
              </label>
              <textarea
                className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={explainNegative}
                onChange={(event) => setExplainNegative(event.target.value)}
              />
            </div>

            <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
              {t("templates.create.step4.hint")}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={handlePrev}
          disabled={step === 0}
        >
          {t("templates.create.prev")}
        </button>
        <div className="flex items-center gap-3">
          {created && (
            <div className="text-xs text-emerald-700">
              {t("templates.create.createdHint")}
            </div>
          )}
          {step < stepLabels.length - 1 ? (
            <button
              type="button"
              className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
              onClick={handleNext}
              disabled={!canNext}
            >
              {t("templates.create.next")}
            </button>
          ) : (
            <button
              type="button"
              className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
              onClick={handleCreate}
              disabled={!canNext}
            >
              {t("templates.create.publish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
