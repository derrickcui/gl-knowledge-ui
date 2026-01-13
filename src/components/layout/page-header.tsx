type PageHeaderProps = {
  title: string;
  breadcrumb: string[];
  meta?: string;
};

export default function PageHeader({ title, breadcrumb, meta }: PageHeaderProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {breadcrumb.join(" / ")}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{title}</div>
      {meta ? <div className="mt-1 text-sm text-slate-400">{meta}</div> : null}
    </div>
  );
}
