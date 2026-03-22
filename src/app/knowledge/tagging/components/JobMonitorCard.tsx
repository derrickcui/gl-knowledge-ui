import { Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { TaggingJobLogsView, TaggingJobView, TaggingTopicResultView } from "@/lib/tagging-api";
import { modeText, progressOf, statusClass } from "../dashboard-utils";
import { t } from "@/i18n";

type JobMonitorCardProps = {
  incrementalEnabled: boolean;
  onToggleIncremental: (enabled: boolean) => void;
  jobs: TaggingJobView[];
  jobsLoading: boolean;
  jobsError: string | null;
  jobsLastUpdatedAt: string | null;
  expandedJobId: string;
  onToggleExpandJob: (jobId: string) => void;
  jobTopicMap: Record<string, TaggingTopicResultView[]>;
  jobDetailMap: Record<string, TaggingJobView>;
  jobTopicsLoadingMap: Record<string, boolean>;
  jobLogsMap: Record<string, TaggingJobLogsView>;
  jobLogsLoadingMap: Record<string, boolean>;
  jobLogsIncludeSuccessMap: Record<string, boolean>;
  jobLogsLevelFilterMap: Record<string, "ALL" | "ERROR" | "WARN" | "PROBLEM">;
  onToggleIncludeSuccessLogs: (jobId: string, includeSuccess: boolean) => void;
  onChangeLogsLevelFilter: (
    jobId: string,
    levelFilter: "ALL" | "ERROR" | "WARN" | "PROBLEM"
  ) => void;
  onRefreshJobs: () => void;
  onRetryJob: (jobId: string) => void;
  actionLoading: boolean;
  topicNameMap: Record<string, string>;
};

export function JobMonitorCard(props: JobMonitorCardProps) {
  const {
    incrementalEnabled,
    onToggleIncremental,
    jobs,
    jobsLoading,
    jobsError,
    jobsLastUpdatedAt,
    expandedJobId,
    onToggleExpandJob,
    jobTopicMap,
    jobDetailMap,
    jobTopicsLoadingMap,
    jobLogsMap,
    jobLogsLoadingMap,
    jobLogsIncludeSuccessMap,
    jobLogsLevelFilterMap,
    onToggleIncludeSuccessLogs,
    onChangeLogsLevelFilter,
    onRefreshJobs,
    onRetryJob,
    actionLoading,
    topicNameMap,
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

  const formatTaskStatus = (value: string | null | undefined) => {
    if (!value) return t("governance.control.pending");
    return value;
  };

  const formatLogScope = (value: string | null | undefined) => {
    if (value === "TOPIC") return t("governance.control.logScope.topic");
    if (value === "TOPICSET") return t("governance.control.logScope.topicSet");
    return t("governance.control.jobScope");
  };

  return (
    <article className="rounded-2xl border border-slate-700 bg-slate-900/85 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("governance.control.jobMonitor")}</h2>
          <div className="mt-1 text-xs text-slate-500">{t("governance.control.jobMonitorHint")}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            onClick={onRefreshJobs}
            disabled={jobsLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${jobsLoading ? "animate-spin" : ""}`} />
          </button>
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
      <div className="mt-1 text-xs text-slate-500">
        {t("governance.control.lastRefreshedAt")}: {formatDateTime(jobsLastUpdatedAt)}
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
          const logs = jobLogsMap[job.jobId];
          const logsLoading = Boolean(jobLogsLoadingMap[job.jobId]);
          const includeSuccessLogs = Boolean(jobLogsIncludeSuccessMap[job.jobId]);
          const logsLevelFilter = jobLogsLevelFilterMap[job.jobId] ?? "PROBLEM";
          const filteredLogs = (logs?.entries ?? []).filter((entry) => {
            if (logsLevelFilter === "ALL") return true;
            if (logsLevelFilter === "ERROR") return entry.level === "ERROR";
            if (logsLevelFilter === "WARN") return entry.level === "WARN";
            return entry.level === "ERROR" || entry.level === "WARN";
          });
          const targetLabel =
            job.mode === "TOPICSET_ONLY"
              ? detail.topicSetId
                ? `${t("governance.control.topicSet")}: ${detail.topicSetId}`
                : t("governance.control.allTopicSets")
              : detail.topicId
              ? `${t("governance.control.topic")}: ${detail.topicId}`
              : t("governance.control.allTopics");
          const versionLabel =
            job.mode === "TOPICSET_ONLY"
              ? detail.topicSetVersion
              : detail.topicVersion;
          const objectTypeLabel =
            job.mode === "TOPICSET_ONLY"
              ? t("governance.control.objectType.topicSet")
              : job.mode === "TOPIC_ONLY"
              ? t("governance.control.objectType.topic")
              : t("governance.control.objectType.global");
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
                  <div className="mb-1 inline-flex rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                    {objectTypeLabel}
                  </div>
                  <div className="text-sm text-white">{modeText(job.mode)}</div>
                  <div className="mt-1 text-xs text-slate-300">{targetLabel}</div>
                  <div className="text-xs text-slate-500">
                    {t("governance.control.version")}: {versionLabel ?? "-"}
                  </div>
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
                  {detail.projection ? (
                    <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2 text-slate-200">
                      <div className="mb-2 text-[11px] uppercase tracking-wide text-cyan-200">
                        {t("governance.control.projectionSummary")}
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.runtimeVersion")}</span>
                          <span>{detail.projection.runtimeVersion ?? "-"}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.namespace")}</span>
                          <span>{detail.projection.namespace ?? "-"}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.projection.topicCount")}</span>
                          <span>{detail.projection.topicCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.projection.assignmentCount")}</span>
                          <span>{detail.projection.assignmentCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.projection.projectedNodeCount")}</span>
                          <span>{detail.projection.projectedNodeCount}</span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-400">{t("governance.control.projection.ancestorExpandedCount")}</span>
                          <span>{detail.projection.ancestorExpandedCount}</span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {logs ? (
                    <div className="flex justify-between text-slate-300">
                      <span>{t("governance.control.topicExecutionSummary")}</span>
                      <span>
                        {logs.successTopics}/{logs.totalTopics} · {t("governance.control.failed")}:{" "}
                        {logs.failedTopics}
                      </span>
                    </div>
                  ) : null}
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
                        <span>{topicNameMap[topic.topicId] ?? topic.topicId}</span>
                        <span>
                          {formatTaskStatus(topic.status)} · {topic.taggedDocs}/
                          {topic.totalDocs}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="pt-2">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-wide text-slate-500">
                        {t("governance.control.logs")}
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={logsLevelFilter}
                          onChange={(event) =>
                            onChangeLogsLevelFilter(
                              job.jobId,
                              event.target.value as "ALL" | "ERROR" | "WARN" | "PROBLEM"
                            )
                          }
                          className="h-7 rounded border border-slate-700 bg-slate-950 px-2 text-[11px] text-slate-300"
                        >
                          <option value="PROBLEM">{t("governance.control.logsFilter.problem")}</option>
                          <option value="ERROR">{t("governance.control.logsFilter.error")}</option>
                          <option value="WARN">{t("governance.control.logsFilter.warn")}</option>
                          <option value="ALL">{t("governance.control.logsFilter.all")}</option>
                        </select>
                        <label className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                          <input
                            type="checkbox"
                            checked={includeSuccessLogs}
                            onChange={(event) =>
                              onToggleIncludeSuccessLogs(job.jobId, event.target.checked)
                            }
                          />
                          <span>{t("governance.control.includeSuccessLogs")}</span>
                        </label>
                      </div>
                    </div>
                    {logsLoading ? (
                      <div className="text-slate-400">{t("governance.control.loadingLogs")}</div>
                    ) : filteredLogs.length ? (
                      <div className="max-h-36 space-y-2 overflow-y-auto rounded border border-slate-800 bg-slate-900/70 p-2">
                        {filteredLogs.slice(0, 12).map((entry, index) => (
                          <div
                            key={`${job.jobId}-log-${index}`}
                            className="rounded border border-slate-800 bg-slate-950/80 p-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className={`text-[11px] font-medium ${
                                  entry.level === "ERROR"
                                    ? "text-rose-300"
                                    : entry.level === "WARN"
                                    ? "text-amber-300"
                                    : "text-sky-300"
                                }`}
                              >
                                {entry.level} · {formatLogScope(entry.scope)}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {formatTaskStatus(entry.status)} · {entry.taggedDocs}/{entry.totalDocs}
                              </span>
                            </div>
                            <div className="mt-1 text-slate-300">{entry.message ?? "-"}</div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {entry.topicId
                                ? `${t("governance.control.topic")}: ${entry.topicId}`
                                : entry.scope === "TOPICSET"
                                ? t("governance.control.logScope.topicSet")
                                : t("governance.control.jobScope")}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        {logs?.entries?.length
                          ? t("governance.control.noLogsForFilter")
                          : t("governance.control.noLogs")}
                      </div>
                    )}
                  </div>
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

