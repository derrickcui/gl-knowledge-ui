"use client";

export type FeedbackType = "error" | "success" | "info";

export function FeedbackBanner({
  type,
  title,
  message,
  onDismiss,
  actions,
}: {
  type: FeedbackType;
  title: string;
  message?: string;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const decodeUnicodeEscapes = (input: string) => {
    const decoded = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    );
    return decoded.replace(/\\(?![\\/\"'bfnrtu])/g, "");
  };

  const displayTitle = decodeUnicodeEscapes(title);
  const displayMessage = message ? decodeUnicodeEscapes(message) : message;
  const styles = {
    error: "border-red-300 bg-red-50 text-red-800",
    success: "border-green-300 bg-green-50 text-green-800",
    info: "border-blue-300 bg-blue-50 text-blue-800",
  };

  return (
    <div className={`rounded-md border p-4 ${styles[type]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium">{displayTitle}</div>
          {message && (
            <div className="mt-1 text-sm opacity-80">
              {displayMessage}
            </div>
          )}
          {actions && <div className="mt-3">{actions}</div>}
        </div>

        {onDismiss && (
          <button
            className="text-xs opacity-60 hover:opacity-100"
            onClick={onDismiss}
          >
            {"\u2715"}
          </button>
        )}
      </div>
    </div>
  );
}
