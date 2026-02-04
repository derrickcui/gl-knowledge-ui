"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  initialConfig,
}: {
  initialData?: InitialTemplateData | null;
  initialTemplateId?: number | null;
  initialConfig?: any | null;
}) {
  const router = useRouter();
  const initRef = useRef(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState<TemplateType>("policy");
  const [customType, setCustomType] = useState("");
  const [allowedModes, setAllowedModes] = useState({
    all: true,
    accrue: false,
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
  const isPublished =
    String(initialData?.status ?? "").toUpperCase() === "PUBLISHED";
  const showTemplateName =
    (step > 0 || !!initialTemplateId || !!initialData?.name) &&
    name.trim().length > 0;

  useEffect(() => {
    if (allowedModes.weighted && !allowedModes.partial) {
      setAllowedModes((prev) => ({ ...prev, partial: true }));
    }
    if (allowedModes.weighted && !importanceAllowed) {
      setImportanceAllowed(true);
    }
  }, [allowedModes.weighted, allowedModes.partial, importanceAllowed]);

  function buildConfigPayload() {
    const allowLogsum = allowedModes.partial || allowedModes.weighted;
    return {
      allowModes: {
        ALL: allowedModes.all,
        ACCRUE: allowedModes.accrue,
        LOGSUM: allowLogsum,
      },
      importance: {
        enabled: importanceAllowed || allowedModes.weighted,
      },
      proximity: {
        enabled: positionRules.near,
        sentence: positionRules.sentence,
        paragraph: positionRules.paragraph,
        order: positionRules.order,
      },
      explain: {
        success: explainPositive,
        fail: explainNegative,
      },
    };
  }

  useEffect(() => {
    if (initRef.current) return;
    if (initialTemplateId) setTemplateId(initialTemplateId);
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
    if (initialConfig) {
      const normalized =
        initialConfig?.config ?? initialConfig?.data ?? initialConfig;
      if (normalized.name && !initialData?.name) {
        setName(normalized.name);
      }
      if (normalized.purpose && !initialData?.description) {
        setPurpose(normalized.purpose);
      }
      if (normalized.type) {
        const rawType = String(normalized.type);
        if (
          rawType === "policy" ||
          rawType === "qualification" ||
          rawType === "process"
        ) {
          setType(rawType as TemplateType);
        } else {
          setType("custom");
          setCustomType(rawType);
        }
      }
      if (normalized.customType) {
        setType("custom");
        setCustomType(String(normalized.customType));
      }
      const allowModes =
        (normalized.allowModes ?? normalized.allow_modes) &&
        typeof (normalized.allowModes ?? normalized.allow_modes) === "object"
          ? (normalized.allowModes ?? normalized.allow_modes)
          : null;
      const hasAllowedModes =
        normalized.allowedModes &&
        typeof normalized.allowedModes === "object";
      const allowLogsum =
        allowModes && "LOGSUM" in allowModes
          ? Boolean(allowModes.LOGSUM)
          : undefined;
      const importanceEnabled =
        normalized.importance?.enabled ?? normalized.importanceEnabled;
      if (allowModes) {
        setAllowedModes((prev) => ({
          ...prev,
          all:
            "ALL" in allowModes ? Boolean(allowModes.ALL) : prev.all,
          accrue:
            "ACCRUE" in allowModes
              ? Boolean(allowModes.ACCRUE)
              : prev.accrue,
          partial: allowLogsum !== undefined ? allowLogsum : prev.partial,
          weighted:
            allowLogsum && importanceEnabled !== undefined
              ? Boolean(importanceEnabled)
              : prev.weighted,
        }));
      } else if (hasAllowedModes) {
        setAllowedModes((prev) => ({
          ...prev,
          all:
            "all" in normalized.allowedModes
              ? Boolean(normalized.allowedModes.all)
              : prev.all,
          partial:
            "partial" in normalized.allowedModes
              ? Boolean(normalized.allowedModes.partial)
              : prev.partial,
          weighted:
            "weighted" in normalized.allowedModes
              ? Boolean(normalized.allowedModes.weighted)
              : prev.weighted,
        }));
      } else if (
        "allowAll" in normalized ||
        "allowAccrue" in normalized ||
        "allowLogsum" in normalized
      ) {
        setAllowedModes((prev) => ({
          ...prev,
          all:
            "allowAll" in normalized
              ? Boolean(normalized.allowAll)
              : prev.all,
          accrue:
            "allowAccrue" in normalized
              ? Boolean(normalized.allowAccrue)
              : prev.accrue,
          partial:
            "allowLogsum" in normalized
              ? Boolean(normalized.allowLogsum)
              : prev.partial,
          weighted:
            "allowLogsum" in normalized
              ? Boolean(normalized.allowLogsum) &&
                Boolean(
                  normalized.allowImportance ??
                    normalized.importance?.enabled
                )
              : prev.weighted,
        }));
      }
      if (typeof importanceEnabled === "boolean") {
        setImportanceAllowed(Boolean(importanceEnabled));
      } else if (typeof normalized.importanceAllowed === "boolean") {
        setImportanceAllowed(normalized.importanceAllowed);
      } else if ("allowImportance" in normalized) {
        setImportanceAllowed(Boolean(normalized.allowImportance));
      }
      const proximity =
        normalized.proximity && typeof normalized.proximity === "object"
          ? normalized.proximity
          : null;
      const hasPositionRules =
        normalized.positionRules &&
        typeof normalized.positionRules === "object";
      if (proximity) {
        setPositionRules((prev) => {
          const paragraph =
            "paragraph" in proximity
              ? Boolean(proximity.paragraph)
              : prev.paragraph;
          const sentence =
            "sentence" in proximity
              ? Boolean(proximity.sentence)
              : prev.sentence;
          const order =
            "order" in proximity ? Boolean(proximity.order) : prev.order;
          const near =
            "enabled" in proximity
              ? Boolean(proximity.enabled)
              : prev.near;
          const any = !(paragraph || sentence || order || near);
          return {
            ...prev,
            any,
            paragraph,
            sentence,
            order,
            near,
          };
        });
      } else if (hasPositionRules) {
        setPositionRules((prev) => ({
          ...prev,
          any:
            "any" in normalized.positionRules
              ? Boolean(normalized.positionRules.any)
              : prev.any,
          paragraph:
            "paragraph" in normalized.positionRules
              ? Boolean(normalized.positionRules.paragraph)
              : prev.paragraph,
          sentence:
            "sentence" in normalized.positionRules
              ? Boolean(normalized.positionRules.sentence)
              : prev.sentence,
          order:
            "order" in normalized.positionRules
              ? Boolean(normalized.positionRules.order)
              : prev.order,
          near:
            "near" in normalized.positionRules
              ? Boolean(normalized.positionRules.near)
              : prev.near,
        }));
      } else if (
        "allowProximity" in normalized ||
        "allowOrder" in normalized ||
        "allowSentence" in normalized ||
        "allowParagraph" in normalized
      ) {
        const nextParagraph =
          "allowParagraph" in normalized
            ? Boolean(normalized.allowParagraph)
            : undefined;
        const nextSentence =
          "allowSentence" in normalized
            ? Boolean(normalized.allowSentence)
            : undefined;
        const nextOrder =
          "allowOrder" in normalized
            ? Boolean(normalized.allowOrder)
            : undefined;
        const nextNear =
          "allowProximity" in normalized
            ? Boolean(normalized.allowProximity)
            : undefined;
        setPositionRules((prev) => {
          const paragraph =
            nextParagraph !== undefined ? nextParagraph : prev.paragraph;
          const sentence =
            nextSentence !== undefined ? nextSentence : prev.sentence;
          const order = nextOrder !== undefined ? nextOrder : prev.order;
          const near = nextNear !== undefined ? nextNear : prev.near;
          const any = !(paragraph || sentence || order || near);
          return {
            ...prev,
            any,
            paragraph,
            sentence,
            order,
            near,
          };
        });
      }
      const explainPositiveValue =
        normalized.explain?.success ??
        normalized.explainPositive ??
        normalized.explainSuccess;
      const explainNegativeValue =
        normalized.explain?.fail ??
        normalized.explainNegative ??
        normalized.explainFail;
      if (explainPositiveValue) {
        setExplainPositive(String(explainPositiveValue));
      }
      if (explainNegativeValue) {
        setExplainNegative(String(explainNegativeValue));
      }
    }
    initRef.current = true;
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
      return (
        allowedModes.all ||
        allowedModes.accrue ||
        allowedModes.partial ||
        allowedModes.weighted
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
      if (isPublished) {
        setStatusMessage({
          type: "info",
          title: t("templates.detail.readOnly"),
        });
        return;
      }
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
      const payload = buildConfigPayload();
      const cfg = await configureTemplate(templateId, payload);
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
        if (isPublished) {
          setStatusMessage({
            type: "info",
            title: t("templates.detail.readOnly"),
          });
          return;
        }
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

        const payload = buildConfigPayload();
        const cfg = await configureTemplate(id, payload);
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
            {showTemplateName ? name : t("templates.create.title")}
          </h1>
          <p className="text-sm opacity-70">
            {showTemplateName
              ? t("templates.create.configSubtitle")
              : t("templates.create.subtitle")}
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
                disabled={submitting || isPublished}
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
                disabled={submitting || isPublished}
              >
                {t("templates.create.save")}
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
                onClick={handleCreate}
                disabled={!canNext || submitting || isPublished}
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
