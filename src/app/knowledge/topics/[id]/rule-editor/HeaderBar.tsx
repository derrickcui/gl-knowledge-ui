import { useState } from "react";
import { t } from "@/i18n";
import type { UiCapabilityViewModel } from "./types";
import { CapabilityIndicatorBar } from "./CapabilityIndicatorBar";
import { useDraggableDialog } from "@/lib/useDraggableDialog";

export type OpenViewOption = "effectValidation" | "gqlPreview" | "diffCompare";

type HeaderBarProps = {
  topicName: string;
  status: string;
  templateLabel?: string;
  capabilityLabel?: string;
  capability?: UiCapabilityViewModel;
  busy?: boolean;
  saveDraftBusy?: boolean;
  deleteDraftBusy?: boolean;
  submitReviewBusy?: boolean;
  publishBusy?: boolean;
  onBack?: () => void;
  onSave?: () => void;
  onDeleteDraft?: () => void;
  onSubmit?: () => void;
  onPublish?: () => void;
  disableSave?: boolean;
  disableSaveHint?: string;
  openViews?: Record<OpenViewOption, boolean>;
  onToggleOpenView?: (option: OpenViewOption, checked: boolean) => void;
};

export function HeaderBar({
  topicName,
  status,
  templateLabel,
  capabilityLabel,
  capability,
  busy = false,
  saveDraftBusy = false,
  deleteDraftBusy = false,
  submitReviewBusy = false,
  publishBusy = false,
  onBack,
  onSave,
  onDeleteDraft,
  onSubmit,
  onPublish,
  disableSave = false,
  disableSaveHint,
  openViews,
  onToggleOpenView,
}: HeaderBarProps) {
  const [capabilityOpen, setCapabilityOpen] = useState(false);
  const [openViewMenuOpen, setOpenViewMenuOpen] = useState(false);
  const capabilityDialogDrag = useDraggableDialog(capabilityOpen);
  const saveDisabled = busy || !onSave || disableSave;
  const deleteDisabled = busy || !onDeleteDraft;
  const submitDisabled = busy || !onSubmit;
  const publishDisabled = busy || !onPublish;

  return (
    <>
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs hover:bg-slate-50"
                onClick={onBack}
              >
                {t("ruleEditor.header.back")}
              </button>
              <div className="text-sm font-semibold">{topicName}</div>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {t("ruleEditor.header.status", { status })}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {t("ruleEditor.header.template", {
                template: templateLabel ?? t("ruleEditor.header.unspecified"),
              })}
              {" | "}
              <button
                type="button"
                className="underline decoration-dotted underline-offset-2 hover:text-slate-700"
                onClick={() => setCapabilityOpen(true)}
              >
                {t("ruleEditor.header.capability", {
                  capability: capabilityLabel ?? t("ruleEditor.header.autoByTemplate"),
                })}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                saveDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "hover:bg-slate-50"
              }`}
              onClick={onSave}
              disabled={saveDisabled}
              title={disableSave ? disableSaveHint : undefined}
            >
              {saveDraftBusy
                ? t("topicActions.savingDraft")
                : t("ruleEditor.header.saveDraft")}
            </button>
            <button
              type="button"
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                deleteDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-red-300 text-red-700 hover:bg-red-50"
              }`}
              onClick={onDeleteDraft}
              disabled={deleteDisabled}
            >
              {deleteDraftBusy
                ? t("topicActions.deletingDraft")
                : t("topicActions.deleteDraft")}
            </button>
            <button
              type="button"
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                submitDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "hover:bg-slate-50"
              }`}
              onClick={onSubmit}
              disabled={submitDisabled}
            >
              {submitReviewBusy
                ? t("topicActions.submittingReview")
                : t("ruleEditor.header.submitReview")}
            </button>
            <button
              type="button"
              className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                publishDisabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "hover:bg-slate-50"
              }`}
              onClick={onPublish}
              disabled={publishDisabled}
            >
              {publishBusy
                ? t("topicActions.publishing")
                : t("ruleEditor.header.publish")}
            </button>
            <div className="relative">
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setOpenViewMenuOpen((prev) => !prev)}
              >
                {t("ruleEditor.header.openView")} {"\u25BE"}
              </button>
              {openViewMenuOpen ? (
                <div className="absolute right-0 z-20 mt-2 min-w-[180px] rounded-lg border bg-white p-2 shadow-lg">
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(openViews?.effectValidation)}
                      onChange={(event) => onToggleOpenView?.("effectValidation", event.target.checked)}
                    />
                    <span>{t("ruleEditor.header.openView.effectValidation")}</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(openViews?.gqlPreview)}
                      onChange={(event) => onToggleOpenView?.("gqlPreview", event.target.checked)}
                    />
                    <span>{t("ruleEditor.header.openView.gqlPreview")}</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(openViews?.diffCompare)}
                      onChange={(event) => onToggleOpenView?.("diffCompare", event.target.checked)}
                    />
                    <span>{t("ruleEditor.header.openView.diffCompare")}</span>
                  </label>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {capabilityOpen && capability ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCapabilityOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            style={capabilityDialogDrag.style}
          >
            <div
              className={`mb-3 flex items-start justify-between gap-4 select-none ${
                capabilityDialogDrag.dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              {...capabilityDialogDrag.handleProps}
            >
              <div>
                <div className="text-base font-semibold">
                  {t("ruleEditor.capability.title")}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {t("ruleEditor.capability.hint")}
                </div>
              </div>
              <button
                type="button"
                className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                onClick={() => setCapabilityOpen(false)}
              >
                {t("common.close")}
              </button>
            </div>
            <CapabilityIndicatorBar
              capability={capability}
              showCollapseToggle={false}
              showHeading={false}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
