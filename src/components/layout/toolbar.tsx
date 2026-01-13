export default function Toolbar() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-sm text-slate-300">
      <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
        <span className="font-semibold text-slate-200">Search</span>
        <span className="text-slate-500">Term, owner, status</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200">Filters</button>
        <button className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200">Bulk Actions</button>
      </div>
      <div className="ml-auto text-xs text-slate-500">View: table</div>
    </div>
  );
}
