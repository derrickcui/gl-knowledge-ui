import { AuditTitle } from "./audit-title";
import { AuditFilters } from "./audit-filters";

export function AuditHeader({
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
    <div className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <AuditTitle />
        <AuditFilters
          actions={actions}
          selectedActions={selectedActions}
          onToggleAction={onToggleAction}
          query={query}
          onQueryChange={onQueryChange}
          beforeDate={beforeDate}
          onBeforeDateChange={onBeforeDateChange}
        />
      </div>
    </div>
  );
}
