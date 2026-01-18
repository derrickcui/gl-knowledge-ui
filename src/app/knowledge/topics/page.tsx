"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createTopic,
  fetchTopics,
  TopicDTO,
} from "@/lib/topic-api";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-800",
  DRAFT: "bg-amber-100 text-amber-800",
};

function getStatusClass(status: string) {
  return STATUS_STYLES[status.toUpperCase()] ?? "bg-gray-100 text-gray-700";
}

function formatUsedBy(usedBy?: string[] | null) {
  if (!usedBy || usedBy.length === 0) return "-";
  return usedBy.join(", ");
}

function formatUpdatedAt(updatedAt?: string | null) {
  if (!updatedAt) return "-";
  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return updatedAt;
  return parsed.toISOString().slice(0, 10);
}

export default function TopicsPage() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const [topics, setTopics] = useState<TopicDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  async function loadTopics(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    const result = await fetchTopics();
    if (!mountedRef.current) return;
    if (result.data) {
      setTopics(result.data.items);
    } else {
      setError(result.error ?? "Unable to load topics.");
    }
    if (showLoading) {
      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadTopics();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const filteredTopics = useMemo(() => {
    const nextQuery = query.trim().toLowerCase();
    if (!nextQuery) return topics;
    return topics.filter((topic) =>
      topic.name.toLowerCase().includes(nextQuery)
    );
  }, [query, topics]);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Topics</h1>
          <p className="text-sm opacity-70">
            Quickly see which topics exist and where they are used.
          </p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => setCreateOpen(true)}
        >
          + New Topic
        </button>
      </div>

      {error && (
        <FeedbackBanner type="error" title={error} />
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          className="h-9 w-56 rounded-md border bg-background px-3 text-sm"
          placeholder="Search topics"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className="h-9 rounded-md border px-3 text-sm"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm opacity-60">Loading...</div>
      ) : (
        <div className="overflow-auto rounded-md border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b px-3 py-2 text-left">
                  Topic Name
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Status
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Used By
                </th>
                <th className="border-b px-3 py-2 text-left">
                  Updated At
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((topic) => (
                <tr key={topic.id} className="hover:bg-muted/60">
                  <td className="border-b px-3 py-2">
                    {topic.name}
                  </td>
                  <td className="border-b px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(
                        topic.status
                      )}`}
                    >
                      {topic.status}
                    </span>
                  </td>
                  <td className="border-b px-3 py-2">
                    {formatUsedBy(topic.usedBy)}
                  </td>
                  <td className="border-b px-3 py-2">
                    {formatUpdatedAt(topic.updatedAt)}
                  </td>
                </tr>
              ))}

              {!filteredTopics.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-sm opacity-60"
                  >
                    No topics found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateTopicDialog
        open={createOpen}
        loading={createLoading}
        name={createName}
        description={createDescription}
        onChangeName={setCreateName}
        onChangeDescription={setCreateDescription}
        onCancel={() => {
          setCreateOpen(false);
          setCreateName("");
          setCreateDescription("");
        }}
        onCreate={async () => {
          if (!createName.trim()) return;
          setCreateLoading(true);
          const result = await createTopic({
            name: createName.trim(),
            description: createDescription.trim() || undefined,
          });
          if (result.data) {
            await loadTopics(false);
            setCreateLoading(false);
            setCreateOpen(false);
            setCreateName("");
            setCreateDescription("");
            router.push(`/knowledge/topics/${result.data.id}`);
            return;
          }
          setCreateLoading(false);
          setError(result.error ?? "Unable to create topic.");
        }}
      />
    </div>
  );
}

function CreateTopicDialog({
  open,
  loading,
  name,
  description,
  onChangeName,
  onChangeDescription,
  onCancel,
  onCreate,
}: {
  open: boolean;
  loading: boolean;
  name: string;
  description: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  if (!open) return null;

  const canCreate = name.trim().length > 0 && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-lg bg-white p-6 shadow-xl">
        <div className="text-base font-semibold">Create Topic</div>
        <div className="mt-4 space-y-4 text-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Topic Name *
            </label>
            <input
              type="text"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="Topic name"
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="What this topic is for"
              value={description}
              onChange={(event) =>
                onChangeDescription(event.target.value)
              }
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1 text-sm"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-60"
            onClick={onCreate}
            disabled={!canCreate}
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
