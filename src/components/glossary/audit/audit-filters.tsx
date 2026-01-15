export function AuditFilters({
  actions,
  selectedActions,
  onToggleAction,
  query,
  onQueryChange,
  beforeDate,
  onBeforeDateChange,
}: {
  actions: Array<{ label: string; value: string }>;
  selectedActions: Set<string>;
  onToggleAction: (action: string) => void;
  query: string;
  onQueryChange: (value: string) => void;
  beforeDate: string;
  onBeforeDateChange: (value: string) => void;
}) {
  return (
    <div className="rounded border bg-background px-3 py-2 text-xs">
      <div className="text-[11px] font-medium text-muted-foreground">
        Filter Audit Records
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search"
          className="h-7 w-48 rounded border bg-background px-2 text-xs"
        />
        <input
          type="date"
          value={beforeDate}
          onChange={(event) => onBeforeDateChange(event.target.value)}
          className="h-7 rounded border bg-background px-2 text-xs"
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Action
        </div>
        <div className="flex flex-wrap items-center gap-3">
        {actions.map((action) => {
          const id = `audit-action-${action.value}`;
          return (
            <label
              key={action.value}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 text-xs text-foreground"
            >
              <input
                id={id}
                type="checkbox"
                className="h-3 w-3"
                checked={selectedActions.has(action.value)}
                onChange={() => onToggleAction(action.value)}
              />
              <span>{action.label}</span>
            </label>
          );
        })}
        </div>
      </div>
    </div>
  );
}
