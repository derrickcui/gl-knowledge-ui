import type { ReviewViewMode } from "./types";

type ViewSwitcherProps = {
  view: ReviewViewMode;
  onChange: (view: ReviewViewMode) => void;
};

const tabs: Array<{ id: ReviewViewMode; label: string }> = [
  { id: "semantic", label: "语义视图" },
  { id: "logic", label: "结构视图" },
  { id: "governance", label: "治理视图" },
];

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="rounded-xl border bg-white p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.id === view;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded px-3 py-1.5 text-sm ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
