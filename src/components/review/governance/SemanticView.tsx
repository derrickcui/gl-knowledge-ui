type SemanticViewProps = {
  title: string;
  summary: string;
};

export function SemanticView({ title, summary }: SemanticViewProps) {
  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">业务语义解释</h3>
      {title ? <p className="mt-3 text-sm text-slate-700">{title}</p> : null}
      <div className="mt-3 rounded border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-900">
        {summary}
      </div>
    </section>
  );
}
