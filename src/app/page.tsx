"use client";

import Link from "next/link";
import { t } from "@/i18n";

export default function HomePage() {
  const demoItems = [
    t("portal.home.demo.1"),
    t("portal.home.demo.2"),
    t("portal.home.demo.3"),
    t("portal.home.demo.4"),
    t("portal.home.demo.5"),
    t("portal.home.demo.6"),
  ];
  const valueItems = [
    t("portal.home.value.1"),
    t("portal.home.value.2"),
    t("portal.home.value.3"),
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(135deg,_#020617,_#0f172a_52%,_#111827)] text-slate-100">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 p-6">
        <section className="rounded-[32px] border border-slate-700/80 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="max-w-4xl">
            <div className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">
              {t("portal.home.badge")}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {t("portal.home.title")}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              {t("portal.home.subtitle")}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-2xl border border-cyan-400/40 bg-cyan-500/15 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              {t("portal.home.cta.search")}
            </Link>
            <Link
              href="/topics"
              className="rounded-2xl border border-emerald-400/40 bg-emerald-500/15 px-5 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/25"
            >
              {t("portal.home.cta.topics")}
            </Link>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-6">
            <div className="text-sm font-semibold text-white">{t("portal.home.card.search.title")}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t("portal.home.card.search.desc")}
            </p>
            <Link href="/search" className="mt-5 inline-flex text-sm text-cyan-300 hover:text-cyan-200">
              {t("portal.home.card.search.link")}
            </Link>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-6">
            <div className="text-sm font-semibold text-white">{t("portal.home.card.topics.title")}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t("portal.home.card.topics.desc")}
            </p>
            <Link href="/topics" className="mt-5 inline-flex text-sm text-emerald-300 hover:text-emerald-200">
              {t("portal.home.card.topics.link")}
            </Link>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-6">
            <div className="text-sm font-semibold text-white">{t("portal.home.card.gov.title")}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t("portal.home.card.gov.desc")}
            </p>
            <Link href="/knowledge/governance" className="mt-5 inline-flex text-sm text-violet-300 hover:text-violet-200">
              {t("portal.home.card.gov.link")}
            </Link>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-6">
            <div className="text-sm font-semibold text-white">{t("portal.home.demo.title")}</div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {demoItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[26px] border border-slate-700/80 bg-slate-950/75 p-6">
            <div className="text-sm font-semibold text-white">{t("portal.home.value.title")}</div>
            <div className="mt-5 space-y-3">
              {valueItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
