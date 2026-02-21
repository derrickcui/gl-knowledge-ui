"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/i18n";
import { fetchRuntimeDeployments, type RuntimeDeploymentItem } from "@/lib/runtime-deploy-api";

const DEPLOY_EVENT = "runtime-deployments-updated";

export function TopicRuntimeStatusBar({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<RuntimeDeploymentItem[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const result = await fetchRuntimeDeployments(topicId);
      if (!active) return;
      setItems(result.data ?? []);
      setLoading(false);
    }
    void load();

    const onDeployUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ topicId?: string }>;
      if (custom.detail?.topicId && custom.detail.topicId !== topicId) return;
      void load();
    };
    window.addEventListener(DEPLOY_EVENT, onDeployUpdated as EventListener);
    return () => {
      active = false;
      window.removeEventListener(DEPLOY_EVENT, onDeployUpdated as EventListener);
    };
  }, [topicId]);

  const environmentStatuses = useMemo(() => {
    const map = new Map<number | string, RuntimeDeploymentItem>();
    for (const item of items) {
      const key = item.runtimeEnvironmentId ?? item.runtimeEnvironmentName;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, item);
        continue;
      }
      const prevTs = prev.deployedAt ? new Date(prev.deployedAt).getTime() : 0;
      const currentTs = item.deployedAt ? new Date(item.deployedAt).getTime() : 0;
      if (currentTs > prevTs) {
        map.set(key, item);
        continue;
      }
      if (currentTs === prevTs) {
        const prevActive = prev.status.toUpperCase() === "ACTIVE";
        const currentActive = item.status.toUpperCase() === "ACTIVE";
        if (currentActive && !prevActive) {
          map.set(key, item);
          continue;
        }
        if (currentActive === prevActive && item.deploymentId > prev.deploymentId) {
          map.set(key, item);
        }
      }
    }
    return Array.from(map.values());
  }, [items]);

  const deployedEnvironmentCount = environmentStatuses.length;
  const hasActive = environmentStatuses.some((item) => item.status.toUpperCase() === "ACTIVE");
  const dotClass = hasActive ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="rounded-lg border bg-white p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <span>
            {t("topicRuntimeStatus.summary", {
              count: loading ? "-" : deployedEnvironmentCount,
            })}
          </span>
        </div>
        <span className="text-xs text-slate-500">{expanded ? t("topicRuntimeStatus.collapse") : t("topicRuntimeStatus.expand")}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm">
          {environmentStatuses.length === 0 ? (
            <div className="text-slate-500">{t("topicRuntimeStatus.empty")}</div>
          ) : (
            environmentStatuses.map((item) => (
              <div key={`${item.deploymentId}-${item.runtimeEnvironmentName}`} className="rounded border bg-slate-50 px-3 py-2">
                {t("topicRuntimeStatus.item", {
                  environment: item.runtimeEnvironmentName,
                  status: item.status.toUpperCase(),
                  version: item.versionLabel,
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const TOPIC_RUNTIME_DEPLOY_EVENT = DEPLOY_EVENT;
