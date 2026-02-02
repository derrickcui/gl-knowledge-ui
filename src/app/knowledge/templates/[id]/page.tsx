"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TemplateCreatePage from "../create/page";

export default function TemplateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/templates/${encodeURIComponent(params.id)}`, { cache: "no-store" });
        if (res.status === 404) {
          if (mounted) setError("模板未找到");
          return;
        }
        if (!res.ok) throw new Error(`fetch failed (${res.status})`);
        const json = await res.json();
        // proxy returns raw body, may be { success, data } or { data } or raw object
        const tpl = json?.data?.data ?? json?.data ?? json;
        if (mounted) setData(tpl);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? "加载失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [params.id]);

  if (loading) return <div className="p-6">加载中...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div>
      <TemplateCreatePage initialData={data} initialTemplateId={Number(params.id)} />
    </div>
  );
}
