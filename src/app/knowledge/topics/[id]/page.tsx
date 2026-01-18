"use client";

import { useParams } from "next/navigation";

export default function TopicDetailPage() {
  const params = useParams<{ id: string }>();
  const topicId = params?.id ?? "";

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Topic</div>
          <div className="text-sm opacity-70">{topicId}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            DRAFT
          </span>
          <button
            type="button"
            className="h-9 rounded-md bg-black px-3 text-sm text-white"
            onClick={() => {
              document
                .getElementById("topic-rules")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Start Editing Rules
          </button>
        </div>
      </div>

      <div
        id="topic-rules"
        className="rounded-lg border bg-muted/20 p-6 text-sm"
      >
        <div className="font-medium">No rules yet</div>
        <p className="mt-2 opacity-70">
          Start by adding a concept or condition to define this
          topic.
        </p>
      </div>
    </div>
  );
}
