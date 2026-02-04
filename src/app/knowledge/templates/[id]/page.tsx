"use client";

import { use, useEffect, useState } from "react";
import { t } from "@/i18n";
import { fetchTemplateById } from "@/lib/api";
import TemplateCreatePage from "../create/page";

const templateDetailCache = new Map<
  string,
  { data: any | null; config: any | null }
>();

export default function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<any | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const cached = templateDetailCache.get(String(id));
        if (cached) {
          if (mounted) {
            setData(cached.data ?? null);
            setConfig(cached.config ?? null);
            setLoading(false);
          }
          return;
        }
        const res = await fetchTemplateById(id);
        if (res.status === 404) {
          if (mounted) setError(t("templates.detail.notFound"));
          return;
        }
        if (res.error) throw new Error(res.error);
        if (mounted) setData(res.data);
        let nextConfig: any | null = null;
        try {
          const resp = await fetch(
            `/api/templates/${encodeURIComponent(String(id))}/config`,
            { cache: "no-store" }
          );
          if (resp.ok) {
            const json = await resp.json();
            nextConfig = json?.data ?? json;
            if (mounted) setConfig(nextConfig);
          }
        } catch {
          if (mounted) setConfig(null);
        }
        templateDetailCache.set(String(id), {
          data: res.data ?? null,
          config: nextConfig,
        });
      } catch (e: any) {
        if (mounted) setError(e?.message ?? t("templates.detail.loadFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">{t("templates.detail.loading")}</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div>
      <TemplateCreatePage
        initialData={data}
        initialTemplateId={Number(id)}
        initialConfig={config}
      />
    </div>
  );
}
