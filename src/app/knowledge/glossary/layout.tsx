import Link from "next/link";

function Tab({
  href,
  label
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1 text-sm hover:bg-accent"
    >
      {label}
    </Link>
  );
}

export default function GlossaryLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <div className="border-b bg-background p-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Glossary</div>
          <div className="flex items-center gap-2">
            <Tab href="/knowledge/glossary/candidates" label="Candidates" />
            <Tab href="/knowledge/glossary/approvals" label="Approvals" />
            <Tab href="/knowledge/glossary/published" label="Published" />
            <Tab href="/knowledge/glossary/audit" label="Audit" />
          </div>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}
