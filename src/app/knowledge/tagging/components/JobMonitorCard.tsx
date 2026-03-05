import { Pause, Play, RotateCcw } from "lucide-react";
import { TaggingJobView, TaggingTopicResultView } from "@/lib/tagging-api";
import { modeText, progressOf, statusClass } from "../dashboard-utils";
import { t } from "@/i18n";

type JobMonitorCardProps = {
  incrementalEnabled: boolean;
  onToggleIncremental: (enabled: boolean) => void;
  jobs: TaggingJobView[];
  jobsLoading: boolean;
  jobsError: string | null;
  expandedJobId: string;
  onToggleExpandJob: (jobId: string) => void;
  jobTopicMap: Record<string, TaggingTopicResultView[]>;
  jobDetailMap: Record<string, TaggingJobView>;
  jobTopicsLoadingMap: Record<string, boolean>;
  onRetryJob: (jobId: string) => void;
  actionLoading: boolean;
};

export function JobMonitorCard(props: JobMonitorCardProps) {
  const {
    incrementalEnabled,
    onToggleIncremental,
    jobs,
    jobsLoading,
    jobsError,
    expandedJobId,
    onToggleExpandJob,
    jobTopicMap,
    jobDetailMap,
    jobTopicsLoadingMap,
    onRetryJob,
    actionLoading,
  } = props;

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "-";
    const startMs = new Date(start).getTime();
    if (Number.isNaN(startMs)) return "-";
    const endMs = end ? new Date(end).getTime() : Date.now();
    if (Number.isNaN(endMs) || endMs < startMs) return "-";
    const seconds = Math.floor((endMs - startMs) / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("governance.control.jobMonitor")}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => onToggleIncremental(false)}
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => onToggleIncremental(true)}
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {t("governance.control.incrementalMode")}: {incrementalEnabled ? t("governance.control.enabled") : t("governance.control.paused")} · {t("governance.control.dataSource")}: /api/tagging/jobs
      </div>
      {jobsError ? (
        <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
          {jobsError}
        </div>
      ) : null}

      <div className="mt-4 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
        {jobsLoading && jobs.length === 0 ? (
          <div className="text-xs text-slate-400">{t("common.loading")}</div>
        ) : null}
        {!jobsLoading && jobs.length === 0 ? (
          <div className="text-xs text-slate-400">{t("governance.control.noJobRecords")}</div>
        ) : null}

        {jobs.map((job) => {
          const progress = progressOf(job);
          const detail = jobDetailMap[job.jobId] ?? job;
          const topics = jobTopicMap[job.jobId] ?? [];
          const topicsLoading = Boolean(jobTopicsLoadingMap[job.jobId]);
          return (
            <div
              key={job.jobId}
              className="rounded-lg border border-slate-700 bg-slate-950/80 p-3"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => onToggleExpandJob(job.jobId)}
              >
                <div>
                  <div className="text-sm text-white">{modeText(job.mode)}</div>
                  <div className="text-xs text-slate-400">{job.jobId}</div>
                </div>
                <span className={`text-xs ${statusClass(job.status)}`}>
                  {job.status ?? t("governance.control.unknown")}
                </span>
              </button>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-300">
                <span>{progress}%</span>
                <span>
                  {detail.taggedDocs.toLocaleString()} /{" "}
                  {detail.totalDocs.toLocaleString()} {t("governance.control.docs")}
                </span>
              </div>

              {expandedJobId === job.jobId ? (
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>{t("governance.control.createdAt")}</span>
                    <span>{formatDateTime(detail.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("governance.control.startedAt")}</span>
                    <span>{formatDateTime(detail.startedAt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("governance.control.finishedAt")}</span>
                    <span>{formatDateTime(detail.finishedAt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("governance.control.duration")}</span>
                    <span>{formatDuration(detail.startedAt, detail.finishedAt)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{t("governance.control.retry")}</span>
                    <span>
                      {detail.retryCount}/{detail.maxRetries}
                    </span>
                  </div>
                  {detail.errorMessage ? (
                    <div className="rounded border border-rose-500/40 bg-rose-500/10 p-2 text-rose-200">
                      {detail.errorMessage}
                    </div>
                  ) : null}
                  {topicsLoading ? (
                    <div className="text-slate-400">{t("governance.control.loadingTopicExecutionDetails")}</div>
                  ) : (
                    topics.slice(0, 8).map((topic) => (
                      <div
                        key={topic.topicId}
                        className="flex justify-between text-slate-300"
                      >
                        <span>{topic.topicId}</span>
                        <span>
                          {topic.status ?? "PENDING"} · {topic.taggedDocs}/
                          {topic.totalDocs}
                        </span>
                      </div>
                    ))
                  )}
                  {job.status === "FAILED" ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
                      onClick={() => onRetryJob(job.jobId)}
                      disabled={actionLoading}
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t("governance.control.retryTask")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

