import { TopicHeaderTabs } from "@/components/topics/TopicHeaderTabs";

type RuleHeaderProps = {
  topicId: string;
  ruleName: string;
  createdAt?: string | null;
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
  createdAt,
  revision,
  status,
  templateText,
  submitter,
  submittedAt,
}: RuleHeaderProps) {
  const safeRuleName = ruleName.trim() || "未命名规则";

  return (
    <div className="space-y-3">
      <TopicHeaderTabs
        topicId={topicId}
        topicName={safeRuleName}
        createdAt={createdAt}
        statusText={status}
        statusCode={status}
        activeTab="REVIEW"
        reviewRevision={revision}
      />
      <div className="rounded-lg border bg-white p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="text-sm">
            <span className="text-slate-500">评审版本：</span>
            <span className="font-medium text-slate-900">v{revision}</span>
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
    </div>
  );
}
