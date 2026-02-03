"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import {
  configureTemplate,
  createTemplateInitial,
  publishTemplate,
} from "@/lib/api";
import {
  TemplateCreateSteps,
  TemplateType,
} from "@/components/templates/template-create-steps";

type InitialTemplateData = {
  id?: number;
  name?: string;
  description?: string;
  category?: string;
  status?: string;
  [key: string]: any;
};

export default function TemplateCreatePage({
  initialData,
  initialTemplateId,
}: {
  initialData?: InitialTemplateData | null;
  initialTemplateId?: number | null;
}) {
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
      ? "When the document meets the following conditions,\nwe consider it belongs to [________]."
      : value;
  }, []);
  const explainNegativeDefault = useMemo(() => {
    const value = t("templates.create.explain.negativeDefault");
    return value === "templates.create.explain.negativeDefault"
      ? "When the minimum conditions are not met,\nthe document does not belong to [________]."
      : value;
  }, []);
  const [explainPositive, setExplainPositive] = useState(
    explainPositiveDefault
  );
  const [explainNegative, setExplainNegative] = useState(
    explainNegativeDefault
  );
  const [created, setCreated] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "info" | "success" | "error";
    title: string;
    message?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [templateId, setTemplateId] = useState<number | null>(null);

  useEffect(() => {
    if (initialTemplateId) {
      setTemplateId(initialTemplateId);
    }
    if (initialData) {
      if (initialData.name) setName(initialData.name);
      if (initialData.description) setPurpose(initialData.description);
      if (initialData.category) {
        const cat = initialData.category as string;
        if (cat === "policy" || cat === "qualification" || cat === "process") {
          setType(cat as TemplateType);
        } else {
          setType("custom");
          setCustomType(cat);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const canNext = useMemo(() => {
    if (step === 0) {
      return name.trim().length > 0 && purpose.trim().length > 0;
    }
    if (step === 1) {
      return allowedModes.all || allowedModes.partial || allowedModes.weighted;
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

  async function handleNext() {
    if (step === 0 && !templateId) {
      try {
        setSubmitting(true);
        setStatusMessage({
          type: "info",
          title: t("templates.create.status.savingStep1"),
        });
        const category = type === "custom" ? customType || "custom" : type;
        const res = await createTemplateInitial({
          name,
          description: purpose,
          category,
          createdBy: "ui-user",
        });
        if (!res.data) throw new Error(res.error ?? "create failed");
        setTemplateId(res.data.id);
        setStatusMessage({
          type: "success",
          title: t("templates.create.status.step1Saved"),
        });
      } catch (e: any) {
        setStatusMessage({
          type: "error",
          title: t("templates.create.status.saveFailed"),
          message: e?.message,
        });
        setSubmitting(false);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    setStep((prev) => Math.min(prev + 1, stepLabels.length - 1));
  }

  function handlePrev() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  async function handleSaveCurrentStep() {
    try {
      setSubmitting(true);
      if (step === 0) {
        setStatusMessage({
          type: "info",
          title: t("templates.create.status.savingStep1"),
        });
        const category = type === "custom" ? customType || "custom" : type;
        const res = await createTemplateInitial({
          name,
          description: purpose,
          category,
          createdBy: "ui-user",
        });
        if (!res.data) throw new Error(res.error ?? "create failed");
        setTemplateId(res.data.id);
        setStatusMessage({
          type: "success",
          title: t("templates.create.status.step1Saved"),
        });
        return;
      }

      if (!templateId) {
        setStatusMessage({
          type: "error",
          title: t("templates.create.status.needStep1"),
        });
        return;
      }

      setStatusMessage({
        type: "info",
        title: t("templates.create.status.savingConfig"),
      });
      const payload = {
        name,
        purpose,
        type: type === "custom" ? customType || "custom" : type,
        customType: type === "custom" ? customType : undefined,
        allowedModes,
        importanceAllowed,
        positionRules,
        explainPositive,
        explainNegative,
      };
      const cfg = await configureTemplate(templateId, payload as any);
      if (!cfg.data) throw new Error(cfg.error ?? "configure failed");
      setStatusMessage({
        type: "success",
        title: t("templates.create.status.saved"),
      });
    } catch (e: any) {
      setStatusMessage({
        type: "error",
        title: t("templates.create.status.saveFailed"),
        message: e?.message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreate() {
    (async () => {
      try {
        setSubmitting(true);
        setStatusMessage({
          type: "info",
          title: t("templates.create.status.publishing"),
        });

        let id = templateId;
        if (!id) {
          const category = type === "custom" ? customType || "custom" : type;
          const res = await createTemplateInitial({
            name,
            description: purpose,
            category,
            createdBy: "ui-user",
          });
          if (!res.data) throw new Error(res.error ?? "create failed");
          id = res.data.id;
          setTemplateId(id);
        }

        const payload = {
          name,
          purpose,
          type: type === "custom" ? customType || "custom" : type,
          customType: type === "custom" ? customType : undefined,
          allowedModes,
          importanceAllowed,
          positionRules,
          explainPositive,
          explainNegative,
        };
        const cfg = await configureTemplate(id, payload as any);
        if (!cfg.data) throw new Error(cfg.error ?? "configure failed");

        setStatusMessage({
          type: "info",
          title: t("templates.create.status.configuredPublishing"),
        });
        const pub = await publishTemplate(id);
        if (!pub.data) throw new Error(pub.error ?? "Publish failed");

        setStatusMessage({
          type: "success",
          title: t("templates.create.status.published"),
        });
        setCreated(true);
      } catch (e: any) {
        setStatusMessage({
          type: "error",
          title: t("templates.create.status.operationFailed"),
          message: e?.message,
        });
      } finally {
        setSubmitting(false);
      }
    })();
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {t("templates.create.title")}
          </h1>
          <p className="text-sm opacity-70">{t("templates.create.subtitle")}</p>
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
        <TemplateCreateSteps
          step={step}
          name={name}
          purpose={purpose}
          type={type}
          customType={customType}
          allowedModes={allowedModes}
          importanceAllowed={importanceAllowed}
          positionRules={positionRules}
          explainPositive={explainPositive}
          explainNegative={explainNegative}
          onNameChange={setName}
          onPurposeChange={setPurpose}
          onTypeChange={setType}
          onCustomTypeChange={setCustomType}
          onAllowedModeChange={(key, value) =>
            setAllowedModes((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          onImportanceAllowedChange={setImportanceAllowed}
          onPositionRuleChange={(key, value) =>
            setPositionRules((prev) => ({
              ...prev,
              [key]: value,
            }))
          }
          onExplainPositiveChange={setExplainPositive}
          onExplainNegativeChange={setExplainNegative}
        />
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
          {statusMessage && (
            <div className="mr-4 w-[360px]">
              <FeedbackBanner
                type={statusMessage.type}
                title={statusMessage.title}
                message={statusMessage.message}
                onDismiss={() => setStatusMessage(null)}
              />
            </div>
          )}
          {created && (
            <div className="text-xs text-emerald-700">
              {t("templates.create.createdHint")}
            </div>
          )}
          {step < stepLabels.length - 1 ? (
            <>
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm"
                onClick={handleSaveCurrentStep}
                disabled={submitting}
              >
                {t("templates.create.save")}
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
                onClick={handleNext}
                disabled={!canNext}
              >
                {t("templates.create.next")}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="h-9 rounded-md border px-3 text-sm"
                onClick={handleSaveCurrentStep}
                disabled={submitting}
              >
                {t("templates.create.save")}
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
                onClick={handleCreate}
                disabled={!canNext || submitting}
              >
                {t("templates.create.publish")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
