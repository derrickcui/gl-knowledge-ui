import Link from "next/link";

export function FacetValidationCard() {
  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <h2 className="text-lg font-semibold">Facet 验证</h2>
      <p className="mt-2 text-xs text-slate-400">
        搜索页将展示带强度条的语义 facet，并注入 fq 参数。
      </p>
      <Link
        href="/search"
        className="mt-3 inline-flex rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-200 hover:bg-blue-500/20"
      >
        打开搜索页验证
      </Link>
    </article>
  );
}
