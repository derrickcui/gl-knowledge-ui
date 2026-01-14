export function ConfirmDialog({
  open,
  subject,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  subject?: {
    title: string;
    meta?: string;
    fromStatus?: string;
    toStatus?: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !subject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold">
          Submit for Review
        </h3>

        <p className="mt-2 text-sm text-muted-foreground">
          You are about to submit the following item for review.
        </p>

        {/* Object card */}
        <div className="mt-4 rounded-md border bg-muted/30 p-3">
          <div className="font-medium">
            {subject.title}
          </div>

          {subject.meta && (
            <div className="mt-1 text-sm opacity-70">
              {subject.meta}
            </div>
          )}

          {subject.fromStatus && subject.toStatus && (
            <div className="mt-1 text-sm">
              status:{" "}
              <span className="line-through opacity-60">
                {subject.fromStatus}
              </span>{" "}
              → <strong>{subject.toStatus}</strong>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white"
            onClick={onConfirm}
          >
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
}
