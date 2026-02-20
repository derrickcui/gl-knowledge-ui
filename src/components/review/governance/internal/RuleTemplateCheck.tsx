import type { TemplateCheckItem } from "../types";

type RuleTemplateCheckProps = {
  checks: TemplateCheckItem[];
};

export function RuleTemplateCheck({ checks }: RuleTemplateCheckProps) {
  return (
    <section className="rounded-xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">模板合规校验</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {checks.map((item) => (
          <li key={item.id} className={item.passed ? "text-emerald-700" : "text-red-700"}>
            {item.passed ? "✔" : "✖"} {item.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
