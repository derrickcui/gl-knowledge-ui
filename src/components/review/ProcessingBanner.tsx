"use client";

export default function ProcessingBanner({
  text,
}: {
  text?: string;
}) {
  return (
    <div className="rounded border border-blue-300 bg-blue-50 p-2 text-sm text-blue-700">
      {text ?? "操作处理中，请稍候…"}
    </div>
  );
}
