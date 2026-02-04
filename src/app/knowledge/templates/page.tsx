"use client";

import { useRouter } from "next/navigation";
import { t } from "@/i18n";
import { useEffect, useState } from "react";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";

const TEMPLATE_LIST_TTL_MS = 30_000;
const templateListCache: {
  data: RuleTemplateItem[] | null;
  error: string | null;
  ts: number;
  promise: Promise<{ data: RuleTemplateItem[]; error: string | null }> | null;
} = {
  data: null,
  error: null,
  ts: 0,
  promise: null,
};

async function fetchTemplatesListCached() {
  const now = Date.now();
  const fresh =
    templateListCache.data &&
    now - templateListCache.ts < TEMPLATE_LIST_TTL_MS;
  if (fresh) {
    return {
      data: templateListCache.data ?? [],
      error: templateListCache.error,
    };
  }
  if (templateListCache.promise) {
    return templateListCache.promise;
  }
  templateListCache.promise = (async () => {
    const res = await fetchTemplatesList();
    if (res.error) {
      const payload = { data: [], error: res.error };
      templateListCache.error = res.error;
      templateListCache.ts = now;
      return payload;
    }
    const data = res.data ?? [];
    templateListCache.data = data;
    templateListCache.error = null;
    templateListCache.ts = now;
    return { data, error: null };
  })();
  try {
    return await templateListCache.promise;
  } finally {
    templateListCache.promise = null;
  }
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  DEPRECATED: "bg-slate-100 text-slate-700",
};

function getStatusLabel(status?: string) {
  if (status === "PUBLISHED") return t("templates.status.published");
  if (status === "DEPRECATED") return t("templates.status.deprecated");
  return t("templates.status.draft");
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDrafts() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchTemplatesListCached();
        if (res.error) throw new Error(res.error);
        if (mounted) setTemplates(res.data ?? []);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDrafts();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("templates.list.title")}</h1>
          <p className="text-sm opacity-70">{t("templates.list.subtitle")}</p>
        </div>
        <button
          type="button"
          className="h-9 rounded-md bg-black px-3 text-sm text-white"
          onClick={() => router.push("/knowledge/templates/create")}
        >
          {t("templates.list.create")}
        </button>
      </div>

      <div className="overflow-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b px-3 py-2 text-left">
                {t("templates.list.columns.name")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("templates.list.columns.status")}
              </th>
              <th className="border-b px-3 py-2 text-left">
                {t("templates.list.columns.updatedAt")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-sm opacity-70">
                  {t("templates.list.loading")}
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && templates.map((tpl) => (
              <tr key={String(tpl.id)} className="hover:bg-muted/60">
                <td className="border-b px-3 py-2">
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() =>
                      router.push(
                        `/knowledge/templates/${encodeURIComponent(String(tpl.id))}`
                      )
                    }
                  >
                    {tpl.name}
                  </button>
                </td>
                <td className="border-b px-3 py-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLES[tpl.status ?? "DRAFT"],
                    ].join(" ")}
                  >
                    {getStatusLabel(tpl.status)}
                  </span>
                </td>
                <td className="border-b px-3 py-2">{tpl.updatedAt}</td>
              </tr>
            ))}
            {!loading && !error && !templates.length && (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-8 text-center text-sm opacity-60"
                >
                  {t("templates.list.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
