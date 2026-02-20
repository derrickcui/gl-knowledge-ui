import Link from "next/link";

type RuleHeaderProps = {
  topicId: string;
  ruleName: string;
  revision: number;
  status: string;
  templateText: string;
  submitter: string;
  submittedAt?: string | null;
};

function formatDate(input?: string | null) {
  if (!input) return "-";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return input;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function RuleHeader({
  topicId,
  ruleName,
  revision,
  status,
  templateText,
  submitter,
  submittedAt,
}: RuleHeaderProps) {
  const safeRuleName = ruleName.trim() || "未命名规则";

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="mb-4 text-sm text-slate-600">
        <Link
          className="hover:text-slate-900"
          href={`/knowledge/topics/${encodeURIComponent(topicId)}`}
        >
          {"<- 返回"}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-slate-900">规则治理评审</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="text-sm">
          <span className="text-slate-500">规则名称：</span>
          <span className="font-medium text-slate-900">{safeRuleName}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">版本：</span>
          <span className="font-medium text-slate-900">v{revision}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">状态：</span>
          <span className="font-medium text-slate-900">{status}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">模板：</span>
          <span className="font-medium text-slate-900">{templateText}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">提交人：</span>
          <span className="font-medium text-slate-900">{submitter}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">时间：</span>
          <span className="font-medium text-slate-900">{formatDate(submittedAt)}</span>
        </div>
      </div>
    </div>
  );
}
