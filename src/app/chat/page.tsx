import PageHeader from "@/components/layout/page-header";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Chat" breadcrumb={["Knowledge Assets", "Chat"]} meta="Contextual copilot." />
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
        Chat workspace placeholder. Add your assistant workflow and tool panel here.
      </div>
    </div>
  );
}
