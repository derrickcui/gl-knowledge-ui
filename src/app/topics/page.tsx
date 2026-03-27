"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchPortalTopicsCatalog,
  fetchPortalTopicsHot,
  PortalCatalogGroup,
  PortalHotTopic,
} from "@/lib/portal-api";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";

function topicHref(topicId: string, datasetName: string) {
  return `/topics/${encodeURIComponent(topicId)}?datasetName=${encodeURIComponent(datasetName)}`;
}

function TopicPortalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const datasetName = searchParams.get("datasetName") ?? "policy";
  const [draftDataset, setDraftDataset] = useState(datasetName);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runtimeVersion, setRuntimeVersion] = useState<number | undefined>();
  const [totalTopics, setTotalTopics] = useState<number>(0);
  const [groups, setGroups] = useState<PortalCatalogGroup[]>([]);
  const [hotTopics, setHotTopics] = useState<PortalHotTopic[]>([]);
  const [growthTopics, setGrowthTopics] = useState<PortalHotTopic[]>([]);
  const [declineTopics, setDeclineTopics] = useState<PortalHotTopic[]>([]);

  useEffect(() => {
    setDraftDataset(datasetName);
  }, [datasetName]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [hotRes, catalogRes] = await Promise.all([
        fetchPortalTopicsHot(datasetName, 8),
        fetchPortalTopicsCatalog(datasetName),
      ]);

      if (cancelled) return;

      setLoading(false);
      setError(hotRes.error ?? catalogRes.error);
      setHotTopics(hotRes.data?.hotTopics ?? []);
      setGrowthTopics(hotRes.data?.growthTopics ?? []);
      setDeclineTopics(hotRes.data?.declineTopics ?? []);
      setGroups(catalogRes.data?.groups ?? []);
      setRuntimeVersion(catalogRes.data?.runtimeVersion);
      setTotalTopics(catalogRes.data?.totalTopics ?? 0);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [datasetName]);

  const totalGroups = groups.length;
  const topWeighted = useMemo(
    () =>
      groups
        .flatMap((group) => group.topics)
        .sort((a, b) => Number(b.weight ?? 0) - Number(a.weight ?? 0))
        .slice(0, 6),
    [groups]
  );

  function applyDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (draftDataset.trim()) params.set("datasetName", draftDataset.trim());
    else params.delete("datasetName");
    const suffix = params.toString();
    router.push(suffix ? `/topics?${suffix}` : "/topics");
  }

  function renderSpotlightTopic(
    topic: PortalHotTopic,
    style: "hot" | "up" | "down"
  ) {
    const tone =
      style === "hot"
        ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
        : style === "up"
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
          : "border-amber-400/30 bg-amber-500/10 text-amber-100";

    return (
      <Link
        key={`${style}-${topic.topicId}`}
        href={topicHref(topic.topicId, topic.datasetName || datasetName)}
        className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-4 transition hover:border-slate-500"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">{topic.topicName}</div>
            <div className="mt-2 text-sm text-slate-300">{topic.namespace || t("portal.topics.card.namespace")}</div>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone}`}>
            {topic.trend || style}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-300">
            <div className="text-slate-500">{t("portal.topics.card.heat")}</div>
            <div className="mt-1 text-sm font-semibold text-white">{topic.heat ?? "-"}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-300">
            <div className="text-slate-500">{t("portal.topics.card.weight")}</div>
            <div className="mt-1 text-sm font-semibold text-white">{topic.weight ?? "-"}</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(135deg,_#020617,_#0f172a_58%,_#111827)] text-slate-100">
      <div className="mx-auto max-w-[1480px] p-6">
        <section className="rounded-[30px] border border-slate-700/80 bg-slate-950/70 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
                {t("portal.topics.badge")}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {t("portal.topics.title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {t("portal.topics.subtitle")}
              </p>
            </div>
            <div className="grid min-w-[220px] gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.topics.metric.dataset")}</div>
                <div className="mt-1 text-lg font-semibold text-white">{datasetName || "-"}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.topics.metric.runtime")}</div>
                <div className="mt-1 text-lg font-semibold text-white">{runtimeVersion ?? "-"}</div>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3">
                <div className="text-slate-400">{t("portal.topics.metric.tracked")}</div>
                <div className="mt-1 text-lg font-semibold text-white">{totalTopics}</div>
              </div>
            </div>
          </div>

          <form onSubmit={applyDataset} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={draftDataset}
              onChange={(event) => setDraftDataset(event.target.value)}
              placeholder={t("portal.topics.form.placeholder")}
              className="h-12 flex-1 rounded-2xl border border-slate-600 bg-slate-900/85 px-4 text-base text-white outline-none placeholder:text-slate-500 focus:border-emerald-400"
            />
            <button
              type="submit"
              className="h-12 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-5 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              {t("portal.topics.form.submit")}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/search"
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
            >
              {t("portal.topics.link.search")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs text-slate-200"
            >
              {t("portal.topics.link.home")}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {loading ? <div className="mt-6 text-sm text-slate-400">{t("portal.topics.loading")}</div> : null}

        <section className="mt-6 grid gap-5 xl:grid-cols-3">
          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{t("portal.topics.hot.title")}</div>
              <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                {t("portal.topics.hot.tag")}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {hotTopics.length ? hotTopics.map((topic) => renderSpotlightTopic(topic, "hot")) : <div className="text-sm text-slate-400">{t("portal.topics.empty.hot")}</div>}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{t("portal.topics.growth.title")}</div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">
                {t("portal.topics.growth.tag")}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {growthTopics.length ? growthTopics.map((topic) => renderSpotlightTopic(topic, "up")) : <div className="text-sm text-slate-400">{t("portal.topics.empty.growth")}</div>}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">{t("portal.topics.decline.title")}</div>
              <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                {t("portal.topics.decline.tag")}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {declineTopics.length ? declineTopics.map((topic) => renderSpotlightTopic(topic, "down")) : <div className="text-sm text-slate-400">{t("portal.topics.empty.decline")}</div>}
            </div>
          </article>
        </section>

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="text-sm font-semibold text-white">{t("portal.topics.summary.title")}</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">{t("portal.topics.summary.groups")}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{totalGroups}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">{t("portal.topics.summary.weighted")}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{topWeighted.length}</div>
              </div>
            </div>

            <div className="mt-5 text-xs uppercase tracking-wide text-slate-500">
              {t("portal.topics.summary.priority")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {topWeighted.map((topic) => (
                <Link
                  key={`top-weight-${topic.topicId}`}
                  href={topicHref(topic.topicId, topic.datasetName || datasetName)}
                  className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100"
                >
                  {topic.topicName} ({topic.weight ?? "-"})
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-5">
            <div className="text-sm font-semibold text-white">{t("portal.topics.catalog.title")}</div>
            <div className="mt-2 text-sm text-slate-400">
              {t("portal.topics.catalog.subtitle")}
            </div>
            <div className="mt-5 space-y-6">
              {groups.length ? (
                groups.map((group) => (
                  <section key={group.groupId}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-white">{group.groupName}</div>
                      <div className="text-xs text-slate-500">{t("portal.topics.catalog.topicCount", { count: group.topics.length })}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.topics.map((topic) => (
                        <Link
                          key={topic.topicId}
                          href={topicHref(topic.topicId, topic.datasetName || datasetName)}
                          className="rounded-full border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-sm text-slate-200 transition hover:border-slate-500"
                        >
                          {topic.topicName}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="text-sm text-slate-400">{t("portal.topics.catalog.empty")}</div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}

export default function TopicPortalPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">{t("common.loading")}</div>}>
      <TopicPortalClient />
    </Suspense>
  );
}
