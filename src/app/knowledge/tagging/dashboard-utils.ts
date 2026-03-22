import { TaggingJobStatus, TaggingJobView } from "@/lib/tagging-api";
import { t } from "@/i18n";

export function heatColor(intensity: number) {
  const alpha = 0.2 + intensity * 0.8;
  return `rgba(96, 165, 250, ${alpha.toFixed(2)})`;
}

export function radarPoint(value: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = value * 0.9;
  const x = 110 + Math.cos(angle) * radius;
  const y = 110 + Math.sin(angle) * radius;
  return { x, y };
}

export function buildTrendPath(
  values: number[],
  width: number,
  height: number,
  max: number
) {
  if (!values.length) return "";
  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function statusClass(status: TaggingJobStatus | null | undefined) {
  if (status === "RUNNING") return "text-blue-300";
  if (status === "SUCCESS") return "text-emerald-300";
  if (status === "FAILED") return "text-rose-300";
  return "text-slate-300";
}

export function modeText(mode: TaggingJobView["mode"]) {
  if (mode === "FULL") return t("governance.control.mode.full");
  if (mode === "TOPICSET_ONLY") return t("governance.control.mode.topicSetOnly");
  return t("governance.control.mode.topicOnly");
}

export function progressOf(job: TaggingJobView) {
  if (!job.totalDocs) return job.status === "SUCCESS" ? 100 : 0;
  return Math.min(100, Math.round((job.taggedDocs / job.totalDocs) * 100));
}
