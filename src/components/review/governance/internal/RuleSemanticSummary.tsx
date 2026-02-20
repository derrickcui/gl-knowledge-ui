type RuleSemanticSummaryProps = {
  titleText?: string;
  summaryText: string;
};

export function RuleSemanticSummary({ titleText, summaryText }: RuleSemanticSummaryProps) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">业务语义解释</h3>

      {titleText ? <div className="mt-3 text-sm text-slate-800">{titleText}</div> : null}

      <div className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
        {summaryText}
      </div>
    </section>
  );
}
