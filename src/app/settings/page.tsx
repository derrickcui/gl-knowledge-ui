import PageHeader from "@/components/layout/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" breadcrumb={["Workspace", "Settings"]} meta="Team and rules." />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
        Settings and integrations surface. Connect Jira, Linear, or Datadog here.
      </div>
    </div>
  );
}
