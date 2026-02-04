"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/i18n";
import { fetchTemplatesList, RuleTemplateItem } from "@/lib/api";

function extractTemplateVersion(
  template: RuleTemplateItem | null,
  config?: any | null
) {
  if (!template && !config) return null;
  const normalizedConfig = config?.config ?? config?.data ?? config;
  return (
    template?.version ??
    template?.templateVersion ??
    template?.revision ??
    template?.rev ??
    template?.publishedVersion ??
    template?.configVersion ??
    normalizedConfig?.version ??
    null
  );
}

function extractTemplateCapabilities(config: any): string {
  if (!config) return "";
  const normalized = config?.config ?? config?.data ?? config;
  const caps = normalized.capabilities ?? normalized.features ?? null;
  if (Array.isArray(caps)) {
    return caps.filter(Boolean).join("、");
  }
  if (typeof caps === "string") return caps;

  const allowModes =
    normalized.allowModes ?? normalized.allow_modes ?? null;
  const allowedModes =
    normalized.allowedModes ?? normalized.allowed_modes ?? null;
  const importanceAllowed =
    normalized.importance?.enabled ??
    normalized.importanceAllowed ??
    normalized.importance_allowed ??
    normalized.allowImportance ??
    false;
  const positionRules =
    normalized.positionRules ?? normalized.position_rules ?? null;
  const proximity = normalized.proximity ?? null;

  const parts: string[] = [];
  if (allowModes && typeof allowModes === "object") {
    const modeLabels: string[] = [];
    if (allowModes.ALL) modeLabels.push("全部满足/任一满足");
    if (allowModes.ACCRUE) modeLabels.push("满足越多越容易成立");
    if (allowModes.LOGSUM) modeLabels.push("满足部分条件");
    if (modeLabels.length === 1) {
      parts.push(`仅支持“${modeLabels[0]}”`);
    } else if (modeLabels.length > 1) {
      parts.push(`支持“${modeLabels.join(" / ")}”`);
    }
  } else if (allowedModes && typeof allowedModes === "object") {
    const modeLabels: string[] = [];
    if (allowedModes.all) modeLabels.push("全部满足/任一满足");
    if (allowedModes.partial) modeLabels.push("满足部分条件");
    if (allowedModes.weighted)
      modeLabels.push("满足部分条件并综合重要性判断");
    if (modeLabels.length === 1) {
      parts.push(`仅支持“${modeLabels[0]}”`);
    } else if (modeLabels.length > 1) {
      parts.push(`支持“${modeLabels.join(" / ")}”`);
    }
  } else if (
    "allowAll" in normalized ||
    "allowAccrue" in normalized ||
    "allowLogsum" in normalized
  ) {
    const modeLabels: string[] = [];
    if (normalized.allowAll) modeLabels.push("全部满足/任一满足");
    if (normalized.allowAccrue) modeLabels.push("满足越多越容易成立");
    if (normalized.allowLogsum) modeLabels.push("满足部分条件");
    if (modeLabels.length === 1) {
      parts.push(`仅支持“${modeLabels[0]}”`);
    } else if (modeLabels.length > 1) {
      parts.push(`支持“${modeLabels.join(" / ")}”`);
    }
  }

  if (importanceAllowed) {
    parts.push("支持“条件重要性”");
  }

  if (proximity && typeof proximity === "object") {
    const positionLabels: Record<string, string> = {
      paragraph: "同一段",
      sentence: "同一句",
      order: "前后顺序",
      enabled: "彼此附近",
    };
    const enabled = Object.entries(proximity)
      .filter(([key, value]) => key !== "any" && Boolean(value))
      .map(([key]) => positionLabels[key] ?? key);
    if (enabled.length) {
      parts.push(`支持“位置关系（${enabled.join(" / ")}）”`);
    }
  } else if (positionRules && typeof positionRules === "object") {
    const positionLabels: Record<string, string> = {
      paragraph: "同一段",
      sentence: "同一句",
      order: "前后顺序",
      near: "彼此附近",
    };
    const enabled = Object.entries(positionRules)
      .filter(([key, value]) => key !== "any" && Boolean(value))
      .map(([key]) => positionLabels[key] ?? key);
    if (enabled.length) {
      parts.push(`支持“位置关系（${enabled.join(" / ")}）”`);
    }
  } else if (
    normalized.allowProximity ||
    normalized.allowOrder ||
    normalized.allowSentence ||
    normalized.allowParagraph
  ) {
    const enabled: string[] = [];
    if (normalized.allowSentence) enabled.push("同一句");
    if (normalized.allowParagraph) enabled.push("同一段");
    if (normalized.allowOrder) enabled.push("前后顺序");
    if (normalized.allowProximity) enabled.push("彼此附近");
    if (enabled.length) {
      parts.push(`支持“位置关系（${enabled.join(" / ")}）”`);
    }
  }

  return parts.join("；");
}

export default function SelectTemplatePage() {
  const search = useSearchParams();
  const router = useRouter();
  const name = search.get("name") ?? "";
  const description = search.get("description") ?? "";

  const [templates, setTemplates] = useState<RuleTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RuleTemplateItem | null>(null);
  const [query, setQuery] = useState("");
  const [templateConfigs, setTemplateConfigs] = useState<
    Record<string, any | null>
  >({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchTemplatesList({ status: "PUBLISHED" });
        if (res.error) {
          setTemplates([]);
        } else {
          const list = res.data ?? [];
          setTemplates(list);
          const configEntries = await Promise.all(
            list.map(async (tpl) => {
              try {
                const resp = await fetch(
                  `/api/templates/${encodeURIComponent(
                    String(tpl.id)
                  )}/config`,
                  { cache: "no-store" }
                );
                if (!resp.ok) return [String(tpl.id), null] as const;
                const json = await resp.json();
                return [String(tpl.id), json?.data ?? json] as const;
              } catch {
                return [String(tpl.id), null] as const;
              }
            })
          );
          const nextConfigs: Record<string, any | null> = {};
          configEntries.forEach(([id, cfg]) => {
            nextConfigs[id] = cfg ?? null;
          });
          setTemplateConfigs(nextConfigs);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = templates.filter((tpl) => {
    const text = `${tpl.name ?? ""} ${tpl.purpose ?? ""} ${tpl.description ?? ""}`
      .toLowerCase()
      .trim();
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return text.includes(needle);
  });
  const selectedVersion = extractTemplateVersion(
    selected,
    templateConfigs[String(selected?.id ?? "")]
  );
  const canProceed = !!selected && !!selectedVersion;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold">
        {t("topics.create.selectTemplate.title")}
      </h1>
      <p className="text-sm opacity-70 mt-2">
        {t("topics.create.selectTemplate.subtitle")}
      </p>

      <div className="mt-4">
        <input
          type="text"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          placeholder="搜索模板…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="mt-4 space-y-3">
        {loading && (
          <div className="text-sm opacity-60">
            {t("topics.create.selectTemplate.loading")}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-sm opacity-60">
            {t("topics.create.selectTemplate.empty")}
          </div>
        )}
        {!loading &&
          filtered.map((tpl) => (
            <button
              key={String(tpl.id)}
              className={`w-full text-left rounded-md border p-3 ${
                selected?.id === tpl.id ? "ring-2 ring-black" : ""
              }`}
              onClick={() => setSelected(tpl)}
            >
              <div className="font-medium">{tpl.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {tpl.purpose ?? tpl.description}
              </div>
              {extractTemplateCapabilities(
                templateConfigs[String(tpl.id)]
              ) && (
                <div className="text-xs text-muted-foreground mt-1">
                  能力：
                  {extractTemplateCapabilities(
                    templateConfigs[String(tpl.id)]
                  )}
                </div>
              )}
              {extractTemplateVersion(
                tpl,
                templateConfigs[String(tpl.id)]
              ) && (
                <div className="text-xs text-muted-foreground mt-1">
                  版本{" "}
                  {extractTemplateVersion(
                    tpl,
                    templateConfigs[String(tpl.id)]
                  )}
                </div>
              )}
            </button>
          ))}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          className="h-9 rounded-md border px-3 text-sm"
          onClick={() => router.back()}
        >
          {t("topics.create.selectTemplate.cancel")}
        </button>
        <button
          className="h-9 rounded-md bg-black px-4 text-sm text-white disabled:opacity-60"
          disabled={!canProceed}
          onClick={() => {
            if (!selected) return;
            router.push(
              `/knowledge/topics/create?templateId=${selected.id}&templateVersion=${encodeURIComponent(
                String(selectedVersion ?? "")
              )}&name=${encodeURIComponent(name)}&description=${encodeURIComponent(description)}`
            );
          }}
        >
          {t("topics.create.selectTemplate.next")}
        </button>
      </div>
    </div>
  );
}
