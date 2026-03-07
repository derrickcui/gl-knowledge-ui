"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import RuntimeEnvironmentEditor from "@/components/runtime/runtime-environment-editor";

export const dynamic = "force-dynamic";

function RuntimeDetailPageClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = Number.parseInt(params.id, 10);
  const readonly = searchParams.get("readonly") === "1";

  if (!Number.isFinite(id)) {
    return <div className="px-6 py-6 text-sm text-red-600">场景 ID 无效。</div>;
  }

  return <RuntimeEnvironmentEditor environmentId={id} forceReadOnly={readonly} />;
}

export default function RuntimeDetailPage() {
  return (
    <Suspense fallback={<div className="px-6 py-6 text-sm text-slate-500">Loading...</div>}>
      <RuntimeDetailPageClient />
    </Suspense>
  );
}
