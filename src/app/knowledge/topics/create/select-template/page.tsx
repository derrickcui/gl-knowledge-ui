"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";

export default function SelectTemplatePage() {
  const search = useSearchParams();
  const router = useRouter();
  const name = search.get("name") ?? "";
  const description = search.get("description") ?? "";
  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [selected, setSelected] = useState<RuleTemplateItem | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const listRes = await fetchTemplatesList({ status: "PUBLISHED" });
      setTemplates(listRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = templates.filter((tpl) => {
    const text = `${tpl.name} ${tpl.description}`.toLowerCase();
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return text.includes(needle);
  });

  return (
    <div className="max-w-3xl p-6">
      <h1 className="text-lg font-semibold">选择模板</h1>
      <p className="mt-1 text-sm text-muted-foreground">选择后进入主题创建。</p>

      <input
        type="text"
        className="mt-4 h-9 w-full rounded-md border px-3 text-sm"
        placeholder="搜索模板"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-4 space-y-3">
        {loading && <div className="text-sm opacity-70">加载中...</div>}
        {!loading &&
          filtered.map((tpl) => (
            <button
              key={String(tpl.id)}
              type="button"
              className={`w-full rounded-md border p-3 text-left ${
                selected?.id === tpl.id ? "ring-2 ring-black" : ""
              }`}
              onClick={() => setSelected(tpl)}
            >
              <div className="font-medium">{tpl.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{tpl.description}</div>
            </button>
          ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => router.back()}
        >
          取消
        </button>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            router.push(
              `/knowledge/topics/create?template=${encodeURIComponent(String(selected.id))}&name=${encodeURIComponent(
                name
              )}&description=${encodeURIComponent(description)}`
            );
          }}
        >
          下一步
        </button>
      </div>
    </div>
  );
}
