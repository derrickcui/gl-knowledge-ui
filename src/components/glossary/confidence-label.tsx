import clsx from "clsx";
import { t } from "@/i18n";

export function ConfidenceLabel({
  value,
}: {
  value: number;
}) {
  let label = t("glossary.confidence.low");
  let color = "text-red-600";

  if (value >= 0.7) {
    label = t("glossary.confidence.high");
    color = "text-green-600";
  } else if (value >= 0.4) {
    label = t("glossary.confidence.medium");
    color = "text-yellow-600";
  }

  return (
    <div className="flex items-center gap-1">
      <span className={clsx("font-medium", color)}>
        {label}
      </span>
      <span className="text-xs opacity-60">
        ({value.toFixed(2)})
      </span>
    </div>
  );
}
