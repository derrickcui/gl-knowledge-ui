import clsx from "clsx";

export function ConfidenceLabel({
  value,
}: {
  value: number;
}) {
  let label = "Low";
  let color = "text-red-600";

  if (value >= 0.7) {
    label = "High";
    color = "text-green-600";
  } else if (value >= 0.4) {
    label = "Medium";
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
