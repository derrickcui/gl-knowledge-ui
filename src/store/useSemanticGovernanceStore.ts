import { create } from "zustand";
import { TaggingJobView, TaggingTopicResultView } from "@/lib/tagging-api";
import {
  AnalyticsCoverageView,
  AnalyticsDocStatsView,
  AnalyticsMatrixDiffView,
  AnalyticsMatrixView,
  AnalyticsOverviewView,
  AnalyticsRuntimeStatusView,
  AnalyticsTopicCorrelationView,
  AnalyticsTopicStatsView,
  AnalyticsTrendView,
} from "@/lib/analytics-api";

export type DimensionKey = "talent" | "policy" | "time" | "region";
export type TrendRange = "7d" | "30d" | "14d";

export type RadarDimension = {
  key: DimensionKey;
  label: string;
  value: number;
  detail: Array<{ name: string; count: number }>;
};

export type HeatCell = {
  docId: string;
  topicId: string;
  topicName: string;
  intensity: number;
  explain: string;
};

type SemanticGovernanceState = {
  range: TrendRange;
  setRange: (range: TrendRange) => void;
  selectedDimension: DimensionKey;
  setSelectedDimension: (key: DimensionKey) => void;
  selectedHeatCell: HeatCell | null;
  setSelectedHeatCell: (cell: HeatCell | null) => void;
  incrementalEnabled: boolean;
  setIncrementalEnabled: (enabled: boolean) => void;
  topicInput: string;
  setTopicInput: (input: string) => void;
  analyticsTopicId: string;
  setAnalyticsTopicId: (topicId: string) => void;

  jobs: TaggingJobView[];
  setJobs: (jobs: TaggingJobView[]) => void;
  jobsLoading: boolean;
  setJobsLoading: (loading: boolean) => void;
  jobsError: string | null;
  setJobsError: (error: string | null) => void;
  actionLoading: boolean;
  setActionLoading: (loading: boolean) => void;
  expandedJobId: string;
  setExpandedJobId: (jobId: string) => void;
  jobTopicMap: Record<string, TaggingTopicResultView[]>;
  setJobTopics: (jobId: string, topics: TaggingTopicResultView[]) => void;
  jobDetailMap: Record<string, TaggingJobView>;
  setJobDetail: (jobId: string, detail: TaggingJobView) => void;
  jobTopicsLoadingMap: Record<string, boolean>;
  setJobTopicsLoading: (jobId: string, loading: boolean) => void;

  events: string[];
  pushEvent: (event: string) => void;

  overview: AnalyticsOverviewView | null;
  setOverview: (overview: AnalyticsOverviewView | null) => void;
  coverage: AnalyticsCoverageView | null;
  setCoverage: (coverage: AnalyticsCoverageView | null) => void;
  trend: AnalyticsTrendView | null;
  setTrend: (trend: AnalyticsTrendView | null) => void;
  matrix: AnalyticsMatrixView | null;
  setMatrix: (matrix: AnalyticsMatrixView | null) => void;
  matrixDiff: AnalyticsMatrixDiffView | null;
  setMatrixDiff: (drift: AnalyticsMatrixDiffView | null) => void;
  topicStats: AnalyticsTopicStatsView | null;
  setTopicStats: (stats: AnalyticsTopicStatsView | null) => void;
  docStats: AnalyticsDocStatsView | null;
  setDocStats: (stats: AnalyticsDocStatsView | null) => void;
  topicCorrelation: AnalyticsTopicCorrelationView | null;
  setTopicCorrelation: (correlation: AnalyticsTopicCorrelationView | null) => void;
  runtimeStatus: AnalyticsRuntimeStatusView | null;
  setRuntimeStatus: (runtimeStatus: AnalyticsRuntimeStatusView | null) => void;
  analyticsLoading: boolean;
  setAnalyticsLoading: (loading: boolean) => void;
  analyticsError: string | null;
  setAnalyticsError: (error: string | null) => void;
};

export const useSemanticGovernanceStore = create<SemanticGovernanceState>(
  (set) => ({
    range: "30d",
    setRange: (range) => set({ range }),
    selectedDimension: "talent",
    setSelectedDimension: (selectedDimension) => set({ selectedDimension }),
    selectedHeatCell: null,
    setSelectedHeatCell: (selectedHeatCell) => set({ selectedHeatCell }),
    incrementalEnabled: true,
    setIncrementalEnabled: (incrementalEnabled) => set({ incrementalEnabled }),
    topicInput: "博士学历",
    setTopicInput: (topicInput) => set({ topicInput }),
    analyticsTopicId: "博士学历",
    setAnalyticsTopicId: (analyticsTopicId) => set({ analyticsTopicId }),

    jobs: [],
    setJobs: (jobs) => set({ jobs }),
    jobsLoading: false,
    setJobsLoading: (jobsLoading) => set({ jobsLoading }),
    jobsError: null,
    setJobsError: (jobsError) => set({ jobsError }),
    actionLoading: false,
    setActionLoading: (actionLoading) => set({ actionLoading }),
    expandedJobId: "",
    setExpandedJobId: (expandedJobId) => set({ expandedJobId }),
    jobTopicMap: {},
    setJobTopics: (jobId, topics) =>
      set((state) => ({
        jobTopicMap: { ...state.jobTopicMap, [jobId]: topics },
      })),
    jobDetailMap: {},
    setJobDetail: (jobId, detail) =>
      set((state) => ({
        jobDetailMap: { ...state.jobDetailMap, [jobId]: detail },
      })),
    jobTopicsLoadingMap: {},
    setJobTopicsLoading: (jobId, loading) =>
      set((state) => ({
        jobTopicsLoadingMap: { ...state.jobTopicsLoadingMap, [jobId]: loading },
      })),

    events: ["系统启动语义标注事件流", "Runtime v5 健康检查通过"],
    pushEvent: (event) =>
      set((state) => ({
        events: [event, ...state.events].slice(0, 10),
      })),

    overview: null,
    setOverview: (overview) => set({ overview }),
    coverage: null,
    setCoverage: (coverage) => set({ coverage }),
    trend: null,
    setTrend: (trend) => set({ trend }),
    matrix: null,
    setMatrix: (matrix) => set({ matrix }),
    matrixDiff: null,
    setMatrixDiff: (matrixDiff) => set({ matrixDiff }),
    topicStats: null,
    setTopicStats: (topicStats) => set({ topicStats }),
    docStats: null,
    setDocStats: (docStats) => set({ docStats }),
    topicCorrelation: null,
    setTopicCorrelation: (topicCorrelation) => set({ topicCorrelation }),
    runtimeStatus: null,
    setRuntimeStatus: (runtimeStatus) => set({ runtimeStatus }),
    analyticsLoading: false,
    setAnalyticsLoading: (analyticsLoading) => set({ analyticsLoading }),
    analyticsError: null,
    setAnalyticsError: (analyticsError) => set({ analyticsError }),
  })
);
