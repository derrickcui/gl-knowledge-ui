"use client";

import { useRouter } from "next/navigation";
import { t } from "@/i18n";

const MOCK_TEMPLATES: Array<{
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "DEPRECATED";
  updatedAt: string;
}> = [];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  DEPRECATED: "bg-slate-100 text-slate-700",
};

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {t("templates.list.title")}
          </h1>
          <p className="text-sm opacity-70">
            {t("templates.list.subtitle")}
          </p>
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
            {MOCK_TEMPLATES.map((tpl) => (
              <tr key={tpl.id} className="hover:bg-muted/60">
                <td className="border-b px-3 py-2">
                  <button
                    type="button"
                    className="font-medium hover:underline"
                    onClick={() =>
                      router.push(
                        `/knowledge/templates/${encodeURIComponent(tpl.id)}`
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
                      STATUS_STYLES[tpl.status],
                    ].join(" ")}
                  >
                    {t(`templates.status.${tpl.status.toLowerCase()}`)}
                  </span>
                </td>
                <td className="border-b px-3 py-2">{tpl.updatedAt}</td>
              </tr>
            ))}
            {!MOCK_TEMPLATES.length && (
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
