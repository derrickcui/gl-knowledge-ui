"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCoverageBlindspots,
  fetchCoverageControl,
  fetchCoverageDistribution,
  fetchCoverageHealth,
  fetchCoverageOverview,
  fetchCoverageTopics,
  GovernanceCoverageHealthResponse,
  recomputeCoverage,
  TopicCoverageBlindspotDoc,
  TopicCoverageControlResponse,
  TopicCoverageDistributionResponse,
  TopicCoverageOverviewResponse,
  TopicCoverageTopicItem,
} from "@/lib/governance-coverage-api";
import { fetchAnalyticsMatrix, AnalyticsMatrixView } from "@/lib/analytics-api";
import {
  captureTopicSignalSnapshot,
  fetchTopicSignalTimeline,
  fetchTopicSignalVersionDiff,
  TopicSignalTimelinePointView,
  TopicSignalVersionDiffResponse,
} from "@/lib/governance-topic-signals-api";
import { searchTopics, TopicDTO } from "@/lib/topic-api";
import {
  createFullTaggingJob,
  createTopicSetTaggingJob,
  createTopicTaggingJob,
  getTaggingJobLogs,
  getTaggingJob,
  listTaggingJobTopics,
  listTaggingJobs,
  retryTaggingJob,
  TaggingJobLogsView,
  TaggingJobMode,
  TaggingJobView,
  TaggingTopicResultView,
} from "@/lib/tagging-api";
import { listTopicSets, TopicSetSummary } from "@/lib/topicset-api";
import { buildTrendPath, radarPoint } from "./dashboard-utils";
import {
  CreateTopicFromBlindspotDialog,
  CreateTopicSeed,
} from "./components/CreateTopicFromBlindspotDialog";
import { DistributionMatrixCard } from "./components/DistributionMatrixCard";
import { JobMonitorCard } from "./components/JobMonitorCard";
import { LiveEventDrawer } from "./components/LiveEventDrawer";
import { HeatCell } from "@/store/useSemanticGovernanceStore";
import { t } from "@/i18n";

const HIT_BUCKET_ORDER = ["0", "1", "2", "3", "4+"];

type RadarMetric = {
  key: string;
  label: string;
  value: number;
};

type SnapshotOption = {
  snapshotId: string;
  capturedAt: string;
  topicRuntimeVersion?: number | null;
  label?: string | null;
};

type CreateTaggingTarget = "TOPIC" | "TOPICSET";
type CreateTopicScope = "FULL" | "SINGLE";

type HealthTone = "good" | "warn" | "bad";

function normalizeRate(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  const normalized = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, normalized));
}

function formatPercent(value: number | null | undefined) {
  return `${normalizeRate(value).toFixed(2)}%`;
}

function healthToneFromScore(score: number | null | undefined): HealthTone {
  const normalized = Number(score ?? 0);
  if (normalized >= 80) return "good";
  if (normalized >= 60) return "warn";
  return "bad";
}

function healthToneLabel(tone: HealthTone) {
  if (tone === "good") return t("governance.control.health.good");
  if (tone === "warn") return t("governance.control.health.warn");
  return t("governance.control.health.bad");
}

function healthToneClass(tone: HealthTone) {
  if (tone === "good") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (tone === "warn") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  return "border-rose-400/40 bg-rose-500/10 text-rose-200";
}

function severityClass(severity: string | null | undefined) {
  if (severity === "ERROR") return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  if (severity === "WARNING") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  return "border-sky-500/40 bg-sky-500/10 text-sky-200";
}

function severityLabel(severity: string | null | undefined) {
  if (severity === "ERROR") return t("governance.control.diagnosis.error");
  if (severity === "WARNING") return t("governance.control.diagnosis.warning");
  return t("governance.control.diagnosis.info");
}

function formatSignedPercentDelta(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  const normalized = value > 1 || value < -1 ? value : value * 100;
  const sign = normalized > 0 ? "+" : "";
  return `${sign}${normalized.toFixed(2)}%`;
}

function runtimeStageTag(baseline: number | null | undefined, current: number | null | undefined) {
  if (typeof baseline !== "number" || typeof current !== "number") return null;
  if (current > baseline) return "After Release";
  if (current < baseline) return "Before Release";
  return "Same Release";
}

function formatTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function modeCoverage(control: TopicCoverageControlResponse | null, mode: string) {
  const found = control?.modes?.find((item) => item.mode?.toUpperCase() === mode);
  return normalizeRate(found?.coverageRate ?? 0);
}

function multiTopicDensity(
  overview: TopicCoverageOverviewResponse | null,
  distribution: TopicCoverageDistributionResponse | null
) {
  const totalDocs = Math.max(0, Number(overview?.totalDocs ?? distribution?.totalDocs ?? 0));
  if (distribution?.distribution?.length && totalDocs > 0) {
    const multiHitDocs = distribution.distribution
      .filter((bucket) => bucket.hitCount === "2" || bucket.hitCount === "3" || bucket.hitCount === "4+")
      .reduce((sum, bucket) => sum + Number(bucket.docCount ?? 0), 0);
    return (multiHitDocs / totalDocs) * 100;
  }
  if (totalDocs <= 0) return 0;
  return (Number(overview?.multiHitDocs ?? 0) / totalDocs) * 100;
}

function toTopicLabel(topic: TopicCoverageTopicItem) {
  return topic.topicName?.trim() || topic.topicId;
}

function suggestedTopicName(title: string | null | undefined, docId: string) {
  const base = (title ?? "").replace(/\s+/g, " ").trim();
  if (!base) return `Blindspot ${docId.slice(0, 8)}`;
  return base.length > 36 ? `${base.slice(0, 36).trim()}...` : base;
}

function getInitialTopicInput(items: TopicCoverageTopicItem[]) {
  const first = items[0];
  if (!first) return "";
  return first.topicId;
}

function decodeSseJob(payload: unknown): TaggingJobView | null {
  if (!payload || typeof payload !== "object") return null;
  const maybeData = (payload as { data?: unknown }).data;
  if (!maybeData || typeof maybeData !== "object") return null;
  const innerData = (maybeData as { data?: unknown }).data;
  if (!innerData || typeof innerData !== "object") return null;
  const record = innerData as Record<string, unknown>;
  if (!("jobId" in record)) return null;
  return {
    ...(record as TaggingJobView),
    topicSetVersion:
      record.topicSetVersion == null ? null : String(record.topicSetVersion),
  };
}

export default function SemanticTaggingPage() {
  const router = useRouter();
  const blindspotRef = useRef<HTMLElement | null>(null);
  const phase3Ref = useRef<HTMLElement | null>(null);
  const taggingOpsRef = useRef<HTMLElement | null>(null);
  const hasHydratedUrlStateRef = useRef(false);
  const lastSseSnapshotKeyRef = useRef<string | null>(null);

  const [overview, setOverview] = useState<TopicCoverageOverviewResponse | null>(null);
  const [topics, setTopics] = useState<TopicCoverageTopicItem[]>([]);
  const [distribution, setDistribution] = useState<TopicCoverageDistributionResponse | null>(null);
  const [blindspots, setBlindspots] = useState<TopicCoverageBlindspotDoc[]>([]);
  const [control, setControl] = useState<TopicCoverageControlResponse | null>(null);
  const [coverageHealth, setCoverageHealth] = useState<GovernanceCoverageHealthResponse | null>(null);
  const [matrix, setMatrix] = useState<AnalyticsMatrixView | null>(null);
  const [selectedHeatCell, setSelectedHeatCell] = useState<HeatCell | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeStatus, setRecomputeStatus] = useState<string | null>(null);

  const [blindspotKeyword, setBlindspotKeyword] = useState("");
  const [distributionAsPercent, setDistributionAsPercent] = useState(false);
  const [selectedTrendTopicId, setSelectedTrendTopicId] = useState("");
  const [timelinePoints, setTimelinePoints] = useState<TopicSignalTimelinePointView[]>([]);
  const [versionDiff, setVersionDiff] = useState<TopicSignalVersionDiffResponse | null>(null);
  const [selectedBaselineSnapshotId, setSelectedBaselineSnapshotId] = useState("");
  const [selectedCurrentSnapshotId, setSelectedCurrentSnapshotId] = useState("");
  const [phase3Loading, setPhase3Loading] = useState(false);
  const [phase3DiffLoading, setPhase3DiffLoading] = useState(false);
  const [phase3Error, setPhase3Error] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [createTopicSeed, setCreateTopicSeed] = useState<CreateTopicSeed | null>(null);
  const [incrementalEnabled, setIncrementalEnabled] = useState(true);
  const [createTargetType, setCreateTargetType] = useState<CreateTaggingTarget>("TOPIC");
  const [topicCreateScope, setTopicCreateScope] = useState<CreateTopicScope>("FULL");
  const [publishedTopics, setPublishedTopics] = useState<TopicDTO[]>([]);
  const [publishedTopicSets, setPublishedTopicSets] = useState<TopicSetSummary[]>([]);
  const [createOptionsLoading, setCreateOptionsLoading] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [topicSetInput, setTopicSetInput] = useState("");
  const [jobModeFilter, setJobModeFilter] = useState<"ALL" | TaggingJobMode>("ALL");
  const [jobs, setJobs] = useState<TaggingJobView[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsLastUpdatedAt, setJobsLastUpdatedAt] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState("");
  const [jobTopicMap, setJobTopicMap] = useState<Record<string, TaggingTopicResultView[]>>({});
  const [jobDetailMap, setJobDetailMap] = useState<Record<string, TaggingJobView>>({});
  const [jobTopicsLoadingMap, setJobTopicsLoadingMap] = useState<Record<string, boolean>>({});
  const [jobLogsMap, setJobLogsMap] = useState<Record<string, TaggingJobLogsView>>({});
  const [jobLogsLoadingMap, setJobLogsLoadingMap] = useState<Record<string, boolean>>({});
  const [jobLogsIncludeSuccessMap, setJobLogsIncludeSuccessMap] = useState<Record<string, boolean>>({});
  const [jobLogsLevelFilterMap, setJobLogsLevelFilterMap] = useState<
    Record<string, "ALL" | "ERROR" | "WARN" | "PROBLEM">
  >({});
  const [sseJobId, setSseJobId] = useState("");
  const [sseConnected, setSseConnected] = useState(false);
  const [sseLogs, setSseLogs] = useState<string[]>([]);
  const [sseError, setSseError] = useState<string | null>(null);
  const [liveProgressLogExpanded, setLiveProgressLogExpanded] = useState(false);

  async function loadCoverageData(showLoading = false) {
    if (showLoading) setLoading(true);

    const [overviewRes, topicsRes, distributionRes, blindspotRes, controlRes, healthRes] = await Promise.all([
      fetchCoverageOverview(),
      fetchCoverageTopics(),
      fetchCoverageDistribution(),
      fetchCoverageBlindspots({ limit: 100 }),
      fetchCoverageControl(),
      fetchCoverageHealth(),
    ]);

    if (showLoading) setLoading(false);

    const firstError =
      overviewRes.error ??
      topicsRes.error ??
      distributionRes.error ??
      blindspotRes.error ??
      controlRes.error ??
      healthRes.error;

    setError(firstError ?? null);

    if (overviewRes.data) setOverview(overviewRes.data);
    if (topicsRes.data) {
      const topicItems = topicsRes.data.topics ?? [];
      setTopics(topicItems);
      if (!topicInput) {
        setTopicInput(getInitialTopicInput(topicItems));
      }
    }
    if (distributionRes.data) setDistribution(distributionRes.data);
    if (blindspotRes.data) setBlindspots(blindspotRes.data.docs ?? []);
    if (controlRes.data) setControl(controlRes.data);
    if (healthRes.data) setCoverageHealth(healthRes.data);

    const matrixRes = await fetchAnalyticsMatrix({ limit: 50, topicLimit: 10 });
    if (matrixRes.data) {
      setMatrix(matrixRes.data);
    }
  }

  async function loadCreateOptions() {
    setCreateOptionsLoading(true);
    const [topicsRes, topicSetsRes] = await Promise.all([
      searchTopics({ status: "PUBLISHED" }),
      listTopicSets(),
    ]);
    if (topicsRes.data) {
      setPublishedTopics(topicsRes.data);
    }
    if (topicSetsRes.data) {
      setPublishedTopicSets(
        topicSetsRes.data.filter((item) => String(item.status).toUpperCase() === "PUBLISHED")
      );
    }
    setCreateOptionsLoading(false);
  }

  async function handleRecompute() {
    setRecomputeLoading(true);
    setRecomputeStatus(t("governance.control.recompute.running"));

    const res = await recomputeCoverage();
    if (!res.data) {
      setRecomputeStatus(
        `${t("governance.control.recompute.failed")}: ${res.error ?? "unknown error"}`
      );
      setRecomputeLoading(false);
      return;
    }

    setRecomputeStatus(
      `${t("governance.control.recompute.completed")}: ${formatTime(res.data.recomputedAt)}`
    );
    await loadCoverageData(false);
    setRecomputeLoading(false);
  }

  async function loadPhase3Data(topicId: string) {
    if (!topicId) return;
    setPhase3Loading(true);
    setPhase3Error(null);

    const timelineRes = await fetchTopicSignalTimeline({
      topicId,
      dataset: overview?.dataset ?? undefined,
      limit: 40,
    });
    if (!timelineRes.data) {
      setTimelinePoints([]);
      setVersionDiff(null);
      setPhase3Error(timelineRes.error ?? t("governance.control.phase3.error.timeline"));
      setPhase3Loading(false);
      return;
    }

    const points = timelineRes.data.points ?? [];
    const sorted = [...points].sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );
    setTimelinePoints(sorted);

    const uniqueSnapshotIds = Array.from(new Set(sorted.map((point) => point.snapshotId)));
    if (uniqueSnapshotIds.length >= 2) {
      const currentSnapshotId = uniqueSnapshotIds[uniqueSnapshotIds.length - 1];
      const baselineSnapshotId = uniqueSnapshotIds[uniqueSnapshotIds.length - 2];
      setSelectedBaselineSnapshotId(baselineSnapshotId);
      setSelectedCurrentSnapshotId(currentSnapshotId);
      await loadPhase3Diff(baselineSnapshotId, currentSnapshotId);
    } else {
      setVersionDiff(null);
      setSelectedBaselineSnapshotId("");
      setSelectedCurrentSnapshotId("");
    }

    setPhase3Loading(false);
  }

  async function loadPhase3Diff(baselineSnapshotId: string, currentSnapshotId: string) {
    if (!baselineSnapshotId || !currentSnapshotId) return;
    if (baselineSnapshotId === currentSnapshotId) {
      setVersionDiff(null);
      setPhase3Error(t("governance.control.phase3.error.snapshotDifferent"));
      return;
    }

    setPhase3DiffLoading(true);
    setPhase3Error(null);
    const diffRes = await fetchTopicSignalVersionDiff({
      baselineSnapshotId,
      currentSnapshotId,
    });
    if (diffRes.data) {
      setVersionDiff(diffRes.data);
    } else {
      setVersionDiff(null);
      setPhase3Error(diffRes.error ?? t("governance.control.phase3.error.versionDiff"));
    }
    setPhase3DiffLoading(false);
  }

  async function handleCaptureSnapshot() {
    setSnapshotBusy(true);
    setPhase3Error(null);
    const now = new Date();
    const label = `coverage-${now.toISOString().slice(0, 19)}`;
    const payload = {
      label,
      dashboard: {
        topicIds: sortedTopics.map((topic) => topic.topicId),
        datasetName: overview?.dataset ?? undefined,
        includeStatistics: true,
        includeRuntime: true,
        includeCompiledGql: false,
        includeAiContext: false,
        includeStructureStats: false,
      },
    };
    const res = await captureTopicSignalSnapshot(payload);
    if (!res.data) {
      setPhase3Error(res.error ?? t("governance.control.phase3.error.capture"));
      setSnapshotBusy(false);
      return;
    }

    setRecomputeStatus(
      `${t("governance.control.snapshot.captured")}: ${formatTime(res.data.capturedAt)}`
    );
    if (selectedTrendTopicId) {
      await loadPhase3Data(selectedTrendTopicId);
    }
    setSnapshotBusy(false);
  }

  function scrollToPhase3() {
    phase3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openCreateTopicModal(seed: CreateTopicSeed) {
    setCreateTopicSeed(seed);
  }

  function closeCreateTopicModal() {
    setCreateTopicSeed(null);
  }

  function scrollToBlindspots() {
    blindspotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToTaggingOps() {
    taggingOpsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadJobs(showLoading = false) {
    if (showLoading) setJobsLoading(true);
    const res = await listTaggingJobs({
      page: 0,
      size: 20,
      mode: jobModeFilter === "ALL" ? undefined : jobModeFilter,
    });
    if (showLoading) setJobsLoading(false);

    if (!res.data) {
      setJobsError(res.error ?? "failed to load jobs");
      return;
    }
    setJobsError(null);
    setJobs(res.data.items);
    setJobsLastUpdatedAt(new Date().toISOString());
    if (!expandedJobId && res.data.items.length > 0) {
      setExpandedJobId(res.data.items[0].jobId);
    }
  }

  async function loadJobDetailAndTopics(jobId: string) {
    if (!jobId) return;
    const includeSuccess = Boolean(jobLogsIncludeSuccessMap[jobId]);
    setJobTopicsLoadingMap((prev) => ({ ...prev, [jobId]: true }));
    setJobLogsLoadingMap((prev) => ({ ...prev, [jobId]: true }));
    const [topicsRes, detailRes, logsRes] = await Promise.all([
      listTaggingJobTopics(jobId),
      getTaggingJob(jobId),
      getTaggingJobLogs(jobId, { includeSuccess }),
    ]);
    setJobTopicsLoadingMap((prev) => ({ ...prev, [jobId]: false }));
    setJobLogsLoadingMap((prev) => ({ ...prev, [jobId]: false }));

    if (topicsRes.data) {
      setJobTopicMap((prev) => ({ ...prev, [jobId]: topicsRes.data ?? [] }));
    }
    if (detailRes.data) {
      setJobDetailMap((prev) => ({ ...prev, [jobId]: detailRes.data as TaggingJobView }));
    }
    if (logsRes.data) {
      setJobLogsMap((prev) => ({ ...prev, [jobId]: logsRes.data as TaggingJobLogsView }));
    }
  }

  async function handleToggleIncludeSuccessLogs(jobId: string, includeSuccess: boolean) {
    setJobLogsIncludeSuccessMap((prev) => ({ ...prev, [jobId]: includeSuccess }));
    if (expandedJobId === jobId) {
      setJobLogsLoadingMap((prev) => ({ ...prev, [jobId]: true }));
      const logsRes = await getTaggingJobLogs(jobId, { includeSuccess });
      setJobLogsLoadingMap((prev) => ({ ...prev, [jobId]: false }));
      if (logsRes.data) {
        setJobLogsMap((prev) => ({ ...prev, [jobId]: logsRes.data as TaggingJobLogsView }));
      }
    }
  }

  function handleChangeLogsLevelFilter(
    jobId: string,
    levelFilter: "ALL" | "ERROR" | "WARN" | "PROBLEM"
  ) {
    setJobLogsLevelFilterMap((prev) => ({ ...prev, [jobId]: levelFilter }));
  }

  async function handleCreateFullTaggingJob() {
    setActionLoading(true);
    const res = await createFullTaggingJob();
    setActionLoading(false);
    if (!res.data) {
      setJobsError(res.error ?? "failed to create full tagging job");
      return;
    }
    setExpandedJobId(res.data.jobId);
    await loadJobs(false);
    await loadJobDetailAndTopics(res.data.jobId);
  }

  async function handleCreateSingleTopicTaggingJob() {
    const topicId = topicInput.trim();
    if (!topicId) return;
    setActionLoading(true);
    const res = await createTopicTaggingJob(topicId);
    setActionLoading(false);
    if (!res.data) {
      setJobsError(res.error ?? "failed to create topic tagging job");
      return;
    }
    setExpandedJobId(res.data.jobId);
    await loadJobs(false);
    await loadJobDetailAndTopics(res.data.jobId);
  }

  async function handleCreateTopicSetTaggingJob() {
    const topicSetId = topicSetInput.trim();
    if (!topicSetId) return;
    setActionLoading(true);
    const res = await createTopicSetTaggingJob(topicSetId);
    setActionLoading(false);
    if (!res.data) {
      setJobsError(res.error ?? "failed to create topicset tagging job");
      return;
    }
    setExpandedJobId(res.data.jobId);
    await loadJobs(false);
    await loadJobDetailAndTopics(res.data.jobId);
  }

  async function handleCreateTaggingJob() {
    if (createTargetType === "TOPICSET") {
      await handleCreateTopicSetTaggingJob();
      return;
    }
    if (topicCreateScope === "SINGLE") {
      await handleCreateSingleTopicTaggingJob();
      return;
    }
    await handleCreateFullTaggingJob();
  }

  async function handleRetryJob(jobId: string) {
    setActionLoading(true);
    const res = await retryTaggingJob(jobId);
    setActionLoading(false);
    if (!res.data) {
      setJobsError(res.error ?? "failed to retry job");
      return;
    }
    await loadJobs(false);
  }

  async function handleRefreshJobs() {
    await loadJobs(true);
    if (expandedJobId) {
      await loadJobDetailAndTopics(expandedJobId);
    }
  }

  useEffect(() => {
    loadCoverageData(true);
    loadCreateOptions();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const topicIdFromQuery = searchParams.get("topicId")?.trim() ?? "";
    const topicSetIdFromQuery = searchParams.get("topicSetId")?.trim() ?? "";
    const modeFromQuery = searchParams.get("mode")?.trim() ?? "";
    const jobIdFromQuery = searchParams.get("jobId")?.trim() ?? "";
    if (
      modeFromQuery === "FULL" ||
      modeFromQuery === "TOPIC_ONLY" ||
      modeFromQuery === "TOPICSET_ONLY"
    ) {
      setJobModeFilter(modeFromQuery);
    }
    if (topicIdFromQuery) {
      setTopicInput(topicIdFromQuery);
      setCreateTargetType("TOPIC");
      setTopicCreateScope("SINGLE");
    }
    if (topicSetIdFromQuery) {
      setTopicSetInput(topicSetIdFromQuery);
      setCreateTargetType("TOPICSET");
      taggingOpsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (modeFromQuery === "FULL") {
      setCreateTargetType("TOPIC");
      setTopicCreateScope("FULL");
    } else if (modeFromQuery === "TOPIC_ONLY") {
      setCreateTargetType("TOPIC");
      setTopicCreateScope("SINGLE");
    } else if (modeFromQuery === "TOPICSET_ONLY") {
      setCreateTargetType("TOPICSET");
    }
    if (jobIdFromQuery) {
      setExpandedJobId(jobIdFromQuery);
    }
    hasHydratedUrlStateRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedUrlStateRef.current) return;
    const searchParams = new URLSearchParams(window.location.search);
    if (jobModeFilter === "ALL") {
      searchParams.delete("mode");
    } else {
      searchParams.set("mode", jobModeFilter);
    }
    if (topicInput.trim()) {
      searchParams.set("topicId", topicInput.trim());
    } else {
      searchParams.delete("topicId");
    }
    if (topicSetInput.trim()) {
      searchParams.set("topicSetId", topicSetInput.trim());
    } else {
      searchParams.delete("topicSetId");
    }
    if (expandedJobId.trim()) {
      searchParams.set("jobId", expandedJobId.trim());
    } else {
      searchParams.delete("jobId");
    }
    const nextQuery = searchParams.toString();
    const nextUrl = nextQuery ? `/knowledge/tagging?${nextQuery}` : "/knowledge/tagging";
    router.replace(nextUrl, { scroll: false });
  }, [expandedJobId, jobModeFilter, router, topicInput, topicSetInput]);

  useEffect(() => {
    loadJobs(true);
    const poller = window.setInterval(() => {
      loadJobs(false);
    }, 5000);
    return () => window.clearInterval(poller);
  }, [jobModeFilter]);

  useEffect(() => {
    if (!expandedJobId) return;
    loadJobDetailAndTopics(expandedJobId);
    if (!sseJobId) {
      setSseJobId(expandedJobId);
    }
  }, [expandedJobId, jobLogsIncludeSuccessMap]);

  useEffect(() => {
    if (!sseConnected || !sseJobId.trim()) return;
    setSseError(null);
    lastSseSnapshotKeyRef.current = null;
    setSseLogs((prev) => [
      t("governance.control.sse.log.connected", {
        jobId: sseJobId,
        time: new Date().toLocaleTimeString(),
      }),
      ...prev,
    ].slice(0, 80));

    const source = new EventSource(
      `/api/tagging/jobs/stream?jobId=${encodeURIComponent(sseJobId.trim())}&intervalMs=2000`
    );
    let closedByTerminalSnapshot = false;

    source.addEventListener("snapshot", (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as unknown;
        const job = decodeSseJob(parsed);
        if (!job) {
          setSseLogs((prev) => [
            t("governance.control.sse.log.snapshotUnparsed", {
              time: new Date().toLocaleTimeString(),
            }),
            ...prev,
          ].slice(0, 80));
          return;
        }
        const snapshotKey = [
          job.jobId,
          job.status ?? "",
          job.taggedDocs,
          job.totalDocs,
          job.errorMessage ?? "",
        ].join("|");
        if (lastSseSnapshotKeyRef.current === snapshotKey) {
          return;
        }
        lastSseSnapshotKeyRef.current = snapshotKey;
        setSseLogs((prev) => [
          t("governance.control.sse.log.snapshot", {
            time: new Date().toLocaleTimeString(),
            jobId: job.jobId,
            status: job.status ?? t("governance.control.unknown"),
            taggedDocs: job.taggedDocs,
            totalDocs: job.totalDocs,
          }),
          ...prev,
        ].slice(0, 80));
        if (job.status === "SUCCESS" || job.status === "FAILED") {
          closedByTerminalSnapshot = true;
          setSseConnected(false);
          source.close();
        }
      } catch {
        setSseLogs((prev) => [
          t("governance.control.sse.log.snapshotParseFailed", {
            time: new Date().toLocaleTimeString(),
          }),
          ...prev,
        ].slice(0, 80));
      }
    });

    source.onerror = () => {
      if (closedByTerminalSnapshot) {
        return;
      }
      setSseError(t("governance.control.sseDisconnected"));
      setSseConnected(false);
      source.close();
    };

    return () => {
      source.close();
    };
  }, [sseConnected, sseJobId]);

  const sortedTopics = useMemo(() => {
    return [...topics].sort((a, b) => normalizeRate(b.coverageRate) - normalizeRate(a.coverageRate));
  }, [topics]);

  useEffect(() => {
    if (selectedTrendTopicId) return;
    if (!sortedTopics.length) return;
    setSelectedTrendTopicId(sortedTopics[0].topicId);
  }, [sortedTopics, selectedTrendTopicId]);

  useEffect(() => {
    if (!selectedTrendTopicId) return;
    loadPhase3Data(selectedTrendTopicId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrendTopicId, overview?.dataset]);

  const normalizedDistribution = useMemo(() => {
    const raw = distribution?.distribution ?? [];
    const map = new Map(raw.map((bucket) => [bucket.hitCount, Number(bucket.docCount ?? 0)]));
    return HIT_BUCKET_ORDER.map((hitCount) => ({
      hitCount,
      docCount: map.get(hitCount) ?? 0,
    }));
  }, [distribution]);

  const distributionTotal = useMemo(() => {
    return normalizedDistribution.reduce((sum, item) => sum + item.docCount, 0);
  }, [normalizedDistribution]);

  const radarMetrics: RadarMetric[] = useMemo(() => {
    const docCoverage = normalizeRate(
      coverageHealth?.summary.coverageRate ?? overview?.overallCoverageRate ?? 0
    );
    const filterControl = modeCoverage(control, "FILTER");
    const boostControl = modeCoverage(control, "BOOST");
    const density = normalizeRate(
      coverageHealth?.summary.multiHitRate ?? multiTopicDensity(overview, distribution)
    );
    const blindspotInverted = Math.max(
      0,
      100 - normalizeRate(coverageHealth?.summary.blindSpotRate)
    );

    return [
      { key: "docCoverage", label: t("governance.control.radar.docCoverage"), value: docCoverage },
      { key: "filterControl", label: t("governance.control.radar.filterControl"), value: filterControl },
      { key: "boostControl", label: t("governance.control.radar.boostParticipation"), value: boostControl },
      { key: "density", label: t("governance.control.radar.multiTopicDensity"), value: density },
      { key: "blindspot", label: t("governance.control.radar.blindspotInverted"), value: blindspotInverted },
    ];
  }, [overview, control, distribution, coverageHealth]);

  const radarPolygon = useMemo(() => {
    return radarMetrics
      .map((metric, index) => {
        const point = radarPoint(metric.value, index, radarMetrics.length);
        return `${point.x},${point.y}`;
      })
      .join(" ");
  }, [radarMetrics]);

  const filteredBlindspots = useMemo(() => {
    const keyword = blindspotKeyword.trim().toLowerCase();
    if (!keyword) return blindspots;
    return blindspots.filter((doc) => {
      const title = (doc.title ?? "").toLowerCase();
      const docId = (doc.docId ?? "").toLowerCase();
      return title.includes(keyword) || docId.includes(keyword);
    });
  }, [blindspots, blindspotKeyword]);
  const selectedPublishedTopicMissing = Boolean(
    topicInput.trim() && !publishedTopics.some((item) => item.id === topicInput.trim())
  );
  const selectedPublishedTopicSetMissing = Boolean(
    topicSetInput.trim() && !publishedTopicSets.some((item) => item.id === topicSetInput.trim())
  );

  const totalDocs = overview?.totalDocs ?? 0;
  const blindspotCount = overview?.uncoveredDocs ?? blindspots.length;
  const coverageRateValue = coverageHealth?.summary.coverageRate ?? overview?.overallCoverageRate ?? 0;
  const multiHitRateValue =
    coverageHealth?.summary.multiHitRate ?? multiTopicDensity(overview, distribution) / 100;
  const blindSpotRateValue =
    coverageHealth?.summary.blindSpotRate ??
    (overview && overview.totalDocs > 0 ? (overview.uncoveredDocs ?? 0) / overview.totalDocs : 0);
  const topRuntimeVersion = overview?.runtimeVersion ?? control?.runtimeVersion ?? "-";
  const trendPathWidth = 620;
  const trendPathHeight = 180;
  const trendValues = timelinePoints.map((point) => normalizeRate(point.percentage));
  const trendMax = Math.max(1, ...trendValues);
  const snapshotOptions: SnapshotOption[] = useMemo(() => {
    const map = new Map<string, SnapshotOption>();
    timelinePoints.forEach((point) => {
      if (map.has(point.snapshotId)) return;
      map.set(point.snapshotId, {
        snapshotId: point.snapshotId,
        capturedAt: point.capturedAt,
        topicRuntimeVersion: point.topicRuntimeVersion,
        label: point.label,
      });
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
    );
  }, [timelinePoints]);
  const releaseTag = runtimeStageTag(
    versionDiff?.baseline?.topicRuntimeVersion,
    versionDiff?.current?.topicRuntimeVersion
  );
  const topicNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    topics.forEach((topic) => {
      const label = topic.topicName?.trim();
      if (label) {
        map[topic.topicId] = label;
      }
    });
    publishedTopics.forEach((topic) => {
      const label = topic.name?.trim();
      if (label && !map[topic.id]) {
        map[topic.id] = label;
      }
    });
    return map;
  }, [publishedTopics, topics]);
  const liveEvents = useMemo(() => {
    const events: string[] = [];
    if (recomputeStatus) events.push(recomputeStatus);
    if (jobsError) {
      events.push(t("governance.control.liveEvents.jobError", { error: jobsError }));
    }
    if (sseError) events.push(`SSE: ${sseError}`);
    events.push(...sseLogs);
    return events.slice(0, 10);
  }, [recomputeStatus, jobsError, sseError, sseLogs]);

  useEffect(() => {
    if (sseConnected || sseError) {
      setLiveProgressLogExpanded(true);
    }
  }, [sseConnected, sseError]);

  const showLiveProgressLog =
    Boolean(sseConnected) || Boolean(sseError) || liveEvents.length > 0;
  const headerHealthTone = healthToneFromScore(coverageHealth?.score);
  const coverageTone = healthToneFromScore(coverageHealth?.breakdown.coverageScore);
  const multiHitTone = healthToneFromScore(coverageHealth?.breakdown.multiHitScore);
  const blindSpotTone = healthToneFromScore(coverageHealth?.breakdown.blindSpotScore);
  const radarToneByKey: Record<string, HealthTone> = {
    docCoverage: coverageTone,
    filterControl: healthToneFromScore(coverageHealth?.breakdown.distributionScore),
    boostControl: healthToneFromScore(coverageHealth?.breakdown.distributionScore),
    density: multiHitTone,
    blindspot: blindSpotTone,
  };

  return (
    <div className="min-h-full bg-background text-slate-100">
      <div className="mx-auto max-w-[1480px] p-6 md:p-8">
        <section className="rounded-2xl border border-blue-400/30 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/70 p-6 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("governance.control.title")}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {t("governance.control.runtimeVersion")}: {topRuntimeVersion} · {t("governance.control.incremental")}:
                {" "}
                {incrementalEnabled ? t("governance.control.on") : t("governance.control.off")} · {t("governance.control.lastRetag")}:
                {" "}
                {formatTime(overview?.generatedAt)} · {t("governance.control.status")}:{" "}
                <span className={`rounded-full border px-2 py-0.5 ${healthToneClass(headerHealthTone)}`}>
                  {coverageHealth?.level ?? t("governance.control.healthy")} ({Number(coverageHealth?.score ?? 0).toFixed(0)})
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={scrollToTaggingOps}
                className="h-10 rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 text-sm text-violet-100"
              >
                {t("governance.control.jumpTaggingOps")}
              </button>
              <button
                type="button"
                disabled={recomputeLoading}
                onClick={handleRecompute}
                className="rounded-lg border border-blue-300/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recomputeLoading ? t("governance.control.recomputing") : t("governance.control.recompute")}
              </button>
              <button
                type="button"
                onClick={scrollToPhase3}
                className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-300"
              >
                {t("governance.control.compareRuntimePhase3")}
              </button>
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                disabled={snapshotBusy}
                className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-300"
              >
                {snapshotBusy ? t("governance.control.capturing") : t("governance.control.captureSnapshot")}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {[
              t("governance.control.tag.coverage"),
              t("governance.control.tag.trend"),
              t("governance.control.tag.distribution"),
              t("governance.control.tag.jobs"),
              t("governance.control.tag.drift"),
              t("governance.control.tag.governance"),
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-600 bg-slate-900/80 px-3 py-1 text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
          {recomputeStatus ? (
            <div className="mt-3 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
              {recomputeStatus}
            </div>
          ) : null}
        </section>

        {loading ? <div className="mt-4 text-xs text-slate-400">{t("governance.control.loadingCoverage")}</div> : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
            {t("governance.control.apiError")}: {error}
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.overview.title")}</h2>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">{t("governance.control.phase1")}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t("governance.control.overview.docs")}</div>
              <div className="mt-2 text-3xl font-semibold">{totalDocs.toLocaleString()}</div>
            </article>
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t("governance.control.overview.topics")}</div>
              <div className="mt-2 text-3xl font-semibold">{(overview?.topics ?? topics.length).toLocaleString()}</div>
            </article>
            <button
              type="button"
              onClick={scrollToBlindspots}
              className="rounded-xl border border-blue-400/30 bg-blue-500/10 p-4 text-left transition hover:bg-blue-500/20"
            >
              <div className="text-xs uppercase tracking-wide text-blue-200">{t("governance.control.overview.coverage")}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-semibold text-white">{formatPercent(coverageRateValue)}</div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${healthToneClass(coverageTone)}`}>
                  {healthToneLabel(coverageTone)}
                </span>
              </div>
            </button>
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t("governance.control.overview.multiHit")}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div className="text-3xl font-semibold">{formatPercent(multiHitRateValue)}</div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${healthToneClass(multiHitTone)}`}>
                  {healthToneLabel(multiHitTone)}
                </span>
              </div>
            </article>
            <button
              type="button"
              onClick={scrollToBlindspots}
              className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-left transition hover:bg-amber-500/20"
            >
              <div className="text-xs uppercase tracking-wide text-amber-200">{t("governance.control.overview.blindspots")}</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold text-white">{blindspotCount.toLocaleString()}</div>
                  <div className="mt-1 text-xs text-amber-100/80">{formatPercent(blindSpotRateValue)}</div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${healthToneClass(blindSpotTone)}`}>
                  {healthToneLabel(blindSpotTone)}
                </span>
              </div>
            </button>
            <article className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-400">{t("governance.control.overview.runtime")}</div>
              <div className="mt-2 text-3xl font-semibold">{topRuntimeVersion}</div>
            </article>
          </div>
        </section>

        {coverageHealth?.diagnosis?.length ? (
          <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="mb-3 text-lg font-semibold">{t("governance.control.diagnosis.title")}</div>
            <div className="space-y-2">
              {coverageHealth.diagnosis.map((item, index) => (
                <div
                  key={`${item.type}-${index}`}
                  className={`rounded-lg border px-3 py-2 text-sm ${severityClass(item.severity)}`}
                >
                  <span className="font-medium">{severityLabel(item.severity)}</span>
                  <span className="mx-2 opacity-60">·</span>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <h2 className="text-lg font-semibold">{t("governance.control.radar.title")}</h2>
            <p className="mt-1 text-xs text-slate-400">{t("governance.control.radar.subtitle")}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
              <svg viewBox="0 0 220 220" className="h-56 w-full">
                <polygon points="110,20 195,82 162,182 58,182 25,82" fill="none" stroke="rgba(148,163,184,0.35)" />
                <polygon points="110,46 170,90 147,160 73,160 50,90" fill="none" stroke="rgba(148,163,184,0.2)" />
                <polygon points={radarPolygon} fill="rgba(56,189,248,0.25)" stroke="rgba(56,189,248,0.95)" strokeWidth={2} />
                {radarMetrics.map((metric, index) => {
                  const point = radarPoint(metric.value, index, radarMetrics.length);
                  return <circle key={metric.key} cx={point.x} cy={point.y} r={4.5} fill="#a78bfa" />;
                })}
              </svg>
              <div className="space-y-2">
                {radarMetrics.map((metric) => (
                  <div key={metric.key} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm">
                    <span className="text-slate-300">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{metric.value.toFixed(2)}%</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${healthToneClass(
                          radarToneByKey[metric.key] ?? headerHealthTone
                        )}`}
                      >
                        {healthToneLabel(radarToneByKey[metric.key] ?? headerHealthTone)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="self-start rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{t("governance.control.topicVolumeTrend")}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {t("governance.card.trend.emptyStateHint")}
                </p>
              </div>
              <select
                value={selectedTrendTopicId}
                onChange={(event) => setSelectedTrendTopicId(event.target.value)}
                className="h-8 min-w-[160px] rounded-md border border-slate-600 bg-slate-950 px-2 text-xs text-slate-100"
              >
                {!sortedTopics.length ? <option value="">{t("governance.control.noTopics")}</option> : null}
                {sortedTopics.map((topic) => (
                  <option key={topic.topicId} value={topic.topicId}>
                    {toTopicLabel(topic)}
                  </option>
                ))}
              </select>
            </div>
            {!timelinePoints.length ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-10">
                <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                  <div className="mb-3 h-16 w-24 rounded-full border border-slate-700/80 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.18),transparent_65%)]" />
                  <p className="text-sm text-slate-300">{t("governance.control.noTrendData")}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {t("governance.card.trend.emptyStateDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${trendPathWidth} ${trendPathHeight + 24}`}
                  className="mt-4 w-full"
                >
                  <line
                    x1="0"
                    y1={trendPathHeight}
                    x2={trendPathWidth}
                    y2={trendPathHeight}
                    stroke="rgba(148,163,184,0.35)"
                  />
                  <path
                    d={buildTrendPath(trendValues, trendPathWidth, trendPathHeight, trendMax)}
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                  />
                </svg>
                <div className="mt-2 text-xs text-slate-400">
                  {t("governance.control.points")}: {timelinePoints.length} · {t("governance.control.latest")}:{" "}
                  {timelinePoints.length
                    ? formatTime(timelinePoints[timelinePoints.length - 1].capturedAt)
                    : "-"}
                </div>
              </>
            )}
          </article>

        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.hitDistributionAnalysis")}</h2>
            <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-300">{t("governance.control.phase2")}</span>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs text-slate-400">{t("governance.control.hitDistributionHint")}</div>
            <button
              type="button"
              onClick={() => setDistributionAsPercent((prev) => !prev)}
              className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
            >
              {t("governance.control.toggle")}: {distributionAsPercent ? "%" : t("governance.control.absolute")}
            </button>
          </div>
          <div className="space-y-2">
            {normalizedDistribution.map((bucket) => {
              const ratio = distributionTotal > 0 ? (bucket.docCount / distributionTotal) * 100 : 0;
              const width = Math.max(4, ratio);
              const value = distributionAsPercent ? `${ratio.toFixed(2)}%` : bucket.docCount.toLocaleString();
              return (
                <div key={bucket.hitCount} className="grid grid-cols-[84px_1fr_90px] items-center gap-3 text-sm">
                  <div className="text-slate-300">{bucket.hitCount}-hit</div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${width}%` }} />
                  </div>
                  <div className="text-right text-slate-200">{value}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <DistributionMatrixCard
            datasetName={matrix?.meta?.dataset}
            docs={matrix?.docs ?? []}
            topics={matrix?.topics ?? []}
            cells={matrix?.cells ?? []}
            rowTotals={matrix?.rowTotals ?? matrix?.aggregates?.rowTotals ?? []}
            columnTotals={matrix?.columnTotals ?? matrix?.aggregates?.columnTotals ?? []}
            selectedHeatCell={selectedHeatCell}
            onSelectHeatCell={setSelectedHeatCell}
          />

          <article ref={blindspotRef} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t("governance.control.blindspotAnalyzer")}</h2>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">
                {t("governance.control.phase1")}
              </span>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-slate-300">
                {t("governance.control.uncoveredDocs")}: {blindspots.length.toLocaleString()}
              </div>
              <input
                value={blindspotKeyword}
                onChange={(event) => setBlindspotKeyword(event.target.value)}
                placeholder={t("governance.control.filterDoc")}
                className="h-9 w-full max-w-xs rounded-md border border-slate-600 bg-slate-950 px-3 text-sm outline-none placeholder:text-slate-500"
              />
            </div>
            {!filteredBlindspots.length ? (
              <div className="text-xs text-slate-400">{t("governance.control.noBlindspotDocs")}</div>
            ) : (
              <div className="max-h-[30rem] overflow-y-auto pr-1">
                <div className="space-y-2">
                  {filteredBlindspots.map((doc) => {
                    const seedName = suggestedTopicName(doc.title, doc.docId);
                    const seedDescription = `Generated from uncovered document ${doc.docId}${doc.title ? `: ${doc.title}` : ""}`;
                    return (
                      <div
                        key={doc.docId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/70 p-3"
                      >
                        <div>
                          <div className="text-sm text-slate-200">{doc.title?.trim() || "(untitled)"}</div>
                          <div className="text-xs text-slate-500">{doc.docId}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              openCreateTopicModal({
                                docId: doc.docId,
                                name: seedName,
                                description: seedDescription,
                              })
                            }
                            className="rounded border border-emerald-500/40 px-2 py-1 text-emerald-200 hover:bg-emerald-500/15"
                          >
                            {t("governance.control.createTopic")}
                          </button>
                          <Link
                            href={`/search?q=${encodeURIComponent(doc.docId)}`}
                            className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800"
                          >
                            {t("governance.control.inspect")}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.topicPerformanceTable")}</h2>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">{t("governance.control.phase1")}</span>
          </div>
          {!sortedTopics.length ? (
            <div className="text-xs text-slate-400">{t("governance.control.noTopicCoverageData")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-2">{t("governance.control.table.topic")}</th>
                    <th className="px-2 py-2">{t("governance.control.table.deployMode")}</th>
                    <th className="px-2 py-2">{t("governance.control.table.hits")}</th>
                    <th className="px-2 py-2">{t("governance.control.table.coverage")}</th>
                    <th className="px-2 py-2">{t("governance.control.table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTopics.map((topic) => (
                    <tr key={topic.topicId} className="border-t border-slate-800">
                      <td className="px-2 py-2 text-slate-200">{toTopicLabel(topic)}</td>
                      <td className="px-2 py-2 text-slate-300">{(topic.deployModes ?? []).join(", ") || "-"}</td>
                      <td className="px-2 py-2 text-slate-300">{Number(topic.hitDocs ?? 0).toLocaleString()}</td>
                      <td className="px-2 py-2 text-slate-300">{formatPercent(topic.coverageRate)}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Link
                            href={`/knowledge/governance/topic/${encodeURIComponent(
                              topic.topicId
                            )}?topicName=${encodeURIComponent(toTopicLabel(topic))}`}
                            className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800"
                          >
                            {t("governance.control.viewHits")}
                          </Link>
                          <button
                            type="button"
                            onClick={scrollToBlindspots}
                            className="rounded border border-amber-500/40 px-2 py-1 text-amber-200 hover:bg-amber-500/15"
                          >
                            {t("governance.control.viewMisses")}
                          </button>
                          <Link
                            href={`/knowledge/topics/${encodeURIComponent(topic.topicId)}`}
                            className="rounded border border-blue-500/40 px-2 py-1 text-blue-200 hover:bg-blue-500/15"
                          >
                            {t("governance.control.edit")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.controlModeCoverage")}</h2>
            <span className="rounded-full border border-blue-400/40 bg-blue-500/10 px-3 py-1 text-[11px] text-blue-300">{t("governance.control.phase2")}</span>
          </div>
          {!control?.modes?.length ? (
            <div className="text-xs text-slate-400">{t("governance.control.noControlModeData")}</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {control.modes.map((mode) => (
                <article key={mode.mode} className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{mode.mode}</div>
                  <div className="mt-2 text-2xl font-semibold">{formatPercent(mode.coverageRate)}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {t("governance.control.topics")}: {mode.topics} · {t("governance.control.coveredDocs")}: {mode.coveredDocs}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section ref={taggingOpsRef} className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.taggingOps")}</h2>
            <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
              {t("governance.control.taggingOpsBadge")}
            </span>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <article className="rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-slate-950/80 to-slate-950/80 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.05)]">
              <div className="mb-1 text-sm font-medium text-slate-100">
                {t("governance.control.createJobs")}
              </div>
              <div className="mb-3 text-xs text-slate-400">
                {t("governance.control.createJobsHint")}
              </div>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-cyan-200">
                    {t("governance.control.createTargetLabel")}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setCreateTargetType("TOPIC")}
                      className={`rounded-lg border px-3 py-3 text-left transition ${
                        createTargetType === "TOPIC"
                          ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                          : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {t("governance.control.createTargetTopic")}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {t("governance.control.createTargetTopicHint")}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateTargetType("TOPICSET")}
                      className={`rounded-lg border px-3 py-3 text-left transition ${
                        createTargetType === "TOPICSET"
                          ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                          : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {t("governance.control.createTargetTopicSet")}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {t("governance.control.createTargetTopicSetHint")}
                      </div>
                    </button>
                  </div>
                </div>

                {createTargetType === "TOPIC" ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-300">
                      {t("governance.control.createModeLabel")}
                    </div>
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2">
                        <input
                          type="radio"
                          name="topic-create-scope"
                          checked={topicCreateScope === "FULL"}
                          onChange={() => setTopicCreateScope("FULL")}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm text-slate-100">
                            {t("governance.control.topicScopeFull")}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {t("governance.control.topicScopeFullHint")}
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2">
                        <input
                          type="radio"
                          name="topic-create-scope"
                          checked={topicCreateScope === "SINGLE"}
                          onChange={() => setTopicCreateScope("SINGLE")}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-slate-100">
                            {t("governance.control.topicScopeSingle")}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400">
                            {t("governance.control.topicScopeSingleHint")}
                          </span>
                          {topicCreateScope === "SINGLE" ? (
                            <select
                              value={topicInput}
                              onChange={(event) => setTopicInput(event.target.value)}
                              className="mt-3 h-9 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                            >
                              <option value="">
                                {createOptionsLoading
                                  ? t("governance.control.loadingPublishedTopics")
                                  : t("governance.control.topicIdPlaceholder")}
                              </option>
                              {selectedPublishedTopicMissing ? (
                                <option value={topicInput}>
                                  {t("governance.control.currentTopicSelection", {
                                    topicId: topicInput,
                                  })}
                                </option>
                              ) : null}
                              {publishedTopics.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name?.trim() || item.id} ({item.id})
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-300">
                      {t("governance.control.createModeLabel")}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t("governance.control.topicSetScopeHint")}
                    </div>
                    <select
                      value={topicSetInput}
                      onChange={(event) => setTopicSetInput(event.target.value)}
                      className="mt-3 h-9 w-full rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                    >
                      <option value="">
                        {createOptionsLoading
                          ? t("governance.control.loadingPublishedTopicSets")
                          : t("governance.control.topicSetIdPlaceholder")}
                      </option>
                      {selectedPublishedTopicSetMissing ? (
                        <option value={topicSetInput}>
                          {t("governance.control.currentTopicSetSelection", {
                            topicSetId: topicSetInput,
                          })}
                        </option>
                      ) : null}
                      {publishedTopicSets.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name?.trim() || item.id} ({item.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateTaggingJob}
                  disabled={
                    actionLoading ||
                    (createTargetType === "TOPICSET"
                      ? !topicSetInput.trim()
                      : topicCreateScope === "SINGLE" && !topicInput.trim())
                  }
                  className="h-10 rounded-md border border-cyan-400/40 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100 disabled:opacity-50"
                >
                  {t("governance.control.startTaggingJob")}
                </button>
              </div>
            </article>

            <article className="xl:col-span-2 rounded-xl border border-slate-700/80 bg-slate-950/55 p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,280px)_1fr]">
                <div>
                  <div className="mb-1 text-sm font-medium text-slate-100">
                    {t("governance.control.taskFilters")}
                  </div>
                  <div className="mb-3 text-xs text-slate-400">
                    {t("governance.control.taskFiltersHint")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {t("governance.control.jobFilterLabel")}
                    </span>
                    <select
                      value={jobModeFilter}
                      onChange={(event) =>
                        setJobModeFilter(event.target.value as "ALL" | TaggingJobMode)
                      }
                      className="h-9 rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
                    >
                      <option value="ALL">{t("governance.control.filter.allModes")}</option>
                      <option value="FULL">{t("governance.control.filter.fullMode")}</option>
                      <option value="TOPIC_ONLY">{t("governance.control.filter.topicMode")}</option>
                      <option value="TOPICSET_ONLY">{t("governance.control.filter.topicSetMode")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm font-medium text-slate-100">
                    {t("governance.control.liveProgress")}
                  </div>
                  <div className="mb-3 text-xs text-slate-400">
                    {t("governance.control.liveProgressHint")}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={sseJobId}
                      onChange={(event) => setSseJobId(event.target.value)}
                      placeholder={t("governance.control.liveProgressJobIdPlaceholder")}
                      className="h-9 w-full max-w-md rounded-md border border-slate-600 bg-slate-900 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                    />
                    {!sseConnected ? (
                      <button
                        type="button"
                        onClick={() => setSseConnected(true)}
                        disabled={!sseJobId.trim()}
                        className="h-9 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 text-sm text-emerald-100 disabled:opacity-50"
                      >
                        {t("governance.control.startLiveProgress")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSseConnected(false)}
                        className="h-9 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 text-sm text-amber-100"
                      >
                        {t("governance.control.stopLiveProgress")}
                      </button>
                    )}
                    <span
                      className={`text-xs ${
                        sseConnected ? "text-emerald-300" : "text-slate-400"
                      }`}
                    >
                      {sseConnected
                        ? t("governance.control.connected")
                        : t("governance.control.disconnected")}
                    </span>
                  </div>
                  {sseError ? (
                    <div className="mt-2 text-xs text-rose-300">{sseError}</div>
                  ) : null}
                </div>
              </div>
            </article>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700/80 bg-slate-950/45 p-1">
            <JobMonitorCard
              incrementalEnabled={incrementalEnabled}
              onToggleIncremental={setIncrementalEnabled}
              jobs={jobs}
              jobsLoading={jobsLoading}
              jobsError={jobsError}
              jobsLastUpdatedAt={jobsLastUpdatedAt}
              expandedJobId={expandedJobId}
              onToggleExpandJob={(jobId) => setExpandedJobId(expandedJobId === jobId ? "" : jobId)}
              jobTopicMap={jobTopicMap}
              jobDetailMap={jobDetailMap}
              jobTopicsLoadingMap={jobTopicsLoadingMap}
              jobLogsMap={jobLogsMap}
              jobLogsLoadingMap={jobLogsLoadingMap}
              jobLogsIncludeSuccessMap={jobLogsIncludeSuccessMap}
              jobLogsLevelFilterMap={jobLogsLevelFilterMap}
              onToggleIncludeSuccessLogs={handleToggleIncludeSuccessLogs}
              onChangeLogsLevelFilter={handleChangeLogsLevelFilter}
              onRefreshJobs={handleRefreshJobs}
              onRetryJob={handleRetryJob}
              actionLoading={actionLoading}
              topicNameMap={topicNameMap}
            />
          </div>
          {showLiveProgressLog ? (
            <LiveEventDrawer
              events={liveEvents}
              className="mt-4 rounded-xl border-slate-700/80 bg-slate-950/45"
              expanded={liveProgressLogExpanded}
              onToggleExpanded={() => setLiveProgressLogExpanded((prev) => !prev)}
            />
          ) : null}
        </section>

        <section ref={phase3Ref} className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("governance.control.trendSnapshotHistory")}</h2>
            <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-[11px] text-violet-300">{t("governance.control.phase3")}</span>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={selectedTrendTopicId}
              onChange={(event) => setSelectedTrendTopicId(event.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            >
              {!sortedTopics.length ? <option value="">{t("governance.control.noTopics")}</option> : null}
              {sortedTopics.map((topic) => (
                <option key={topic.topicId} value={topic.topicId}>
                  {toTopicLabel(topic)}
                </option>
              ))}
            </select>
            <select
              value={selectedBaselineSnapshotId}
              onChange={(event) => setSelectedBaselineSnapshotId(event.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            >
              {!snapshotOptions.length ? <option value="">{t("governance.control.baselineSnapshot")}</option> : null}
              {snapshotOptions.map((snapshot) => (
                <option key={`baseline-${snapshot.snapshotId}`} value={snapshot.snapshotId}>
                  {t("governance.control.baseline")} · {snapshot.label?.trim() || snapshot.snapshotId} · {formatTime(snapshot.capturedAt)}
                </option>
              ))}
            </select>
            <select
              value={selectedCurrentSnapshotId}
              onChange={(event) => setSelectedCurrentSnapshotId(event.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100"
            >
              {!snapshotOptions.length ? <option value="">{t("governance.control.currentSnapshot")}</option> : null}
              {snapshotOptions.map((snapshot) => (
                <option key={`current-${snapshot.snapshotId}`} value={snapshot.snapshotId}>
                  {t("governance.control.current")} · {snapshot.label?.trim() || snapshot.snapshotId} · {formatTime(snapshot.capturedAt)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadPhase3Data(selectedTrendTopicId)}
              disabled={phase3Loading || !selectedTrendTopicId}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-xs text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("governance.control.refreshTimeline")}
            </button>
            <button
              type="button"
              onClick={() => loadPhase3Diff(selectedBaselineSnapshotId, selectedCurrentSnapshotId)}
              disabled={
                phase3DiffLoading ||
                !selectedBaselineSnapshotId ||
                !selectedCurrentSnapshotId ||
                selectedBaselineSnapshotId === selectedCurrentSnapshotId
              }
              className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase3DiffLoading ? t("governance.control.comparing") : t("governance.control.compareSelected")}
            </button>
            <button
              type="button"
              onClick={handleCaptureSnapshot}
              disabled={snapshotBusy}
              className="rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs text-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {snapshotBusy ? t("governance.control.capturing") : t("governance.control.captureNewSnapshot")}
            </button>
          </div>

          {phase3Loading ? <div className="mb-3 text-xs text-slate-400">{t("governance.control.loadingSnapshotTimeline")}</div> : null}
          {phase3DiffLoading ? <div className="mb-3 text-xs text-slate-400">{t("governance.control.loadingVersionDiff")}</div> : null}
          {phase3Error ? (
            <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {t("governance.control.phase3Error")}: {phase3Error}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <div className="text-sm font-medium text-slate-200">{t("governance.control.coverageOverTime")}</div>
              {!timelinePoints.length ? (
                <div className="mt-3 text-xs text-slate-400">{t("governance.control.noSnapshotPoints")}</div>
              ) : (
                <>
                  <svg
                    viewBox={`0 0 ${trendPathWidth} ${trendPathHeight + 24}`}
                    className="mt-3 w-full"
                  >
                    <line
                      x1="0"
                      y1={trendPathHeight}
                      x2={trendPathWidth}
                      y2={trendPathHeight}
                      stroke="rgba(148,163,184,0.35)"
                    />
                    <path
                      d={buildTrendPath(trendValues, trendPathWidth, trendPathHeight, trendMax)}
                      fill="none"
                      stroke="#67e8f9"
                      strokeWidth={2.5}
                    />
                  </svg>
                  <div className="mt-2 text-xs text-slate-400">
                    {t("governance.control.points")}: {timelinePoints.length} · {t("governance.control.latest")}:{" "}
                    {timelinePoints.length ? formatTime(timelinePoints[timelinePoints.length - 1].capturedAt) : "-"}
                  </div>
                </>
              )}
            </article>

            <article className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-slate-200">{t("governance.control.runtimeVersionCompare")}</div>
                {releaseTag ? (
                  <span className="rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
                    {releaseTag}
                  </span>
                ) : null}
              </div>
              {!versionDiff ? (
                <div className="mt-3 text-xs text-slate-400">
                  {t("governance.control.needTwoSnapshots")}
                </div>
              ) : (
                <>
                  <div className="mt-2 text-xs text-slate-400">
                    {t("governance.control.baseline")}: {formatTime(versionDiff.baseline?.capturedAt)} ({versionDiff.baseline?.snapshotId}) · {t("governance.control.runtime")} v
                    {versionDiff.baseline?.topicRuntimeVersion ?? "-"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {t("governance.control.current")}: {formatTime(versionDiff.current?.capturedAt)} ({versionDiff.current?.snapshotId}) · {t("governance.control.runtime")} v
                    {versionDiff.current?.topicRuntimeVersion ?? "-"}
                  </div>
                  <div className="mt-3 max-h-52 overflow-auto rounded border border-slate-800">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-900 text-slate-400">
                        <tr>
                          <th className="px-2 py-2 text-left">{t("governance.control.table.topic")}</th>
                          <th className="px-2 py-2 text-left">{t("governance.control.docsDelta")}</th>
                          <th className="px-2 py-2 text-left">{t("governance.control.coverageDelta")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {versionDiff.topics.slice(0, 12).map((item) => (
                          <tr key={item.topicId} className="border-t border-slate-800">
                            <td className="px-2 py-2 text-slate-200">{item.topicName?.trim() || item.topicId}</td>
                            <td
                              className={`px-2 py-2 ${
                                item.matchedDocsDelta >= 0 ? "text-emerald-300" : "text-rose-300"
                              }`}
                            >
                              {item.matchedDocsDelta >= 0 ? "+" : ""}
                              {item.matchedDocsDelta}
                            </td>
                            <td
                              className={`px-2 py-2 ${
                                item.percentageDelta >= 0 ? "text-emerald-300" : "text-rose-300"
                              }`}
                            >
                              {formatSignedPercentDelta(item.percentageDelta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </article>
          </div>
        </section>
      </div>

      <CreateTopicFromBlindspotDialog
        seed={createTopicSeed}
        onClose={closeCreateTopicModal}
        onCreated={(topicId) => router.push(`/knowledge/topics/${encodeURIComponent(topicId)}`)}
      />
    </div>
  );
}

