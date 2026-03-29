"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocale, t } from "@/i18n";
import {
  createRun,
  executeRun,
  generateSample,
  getRun,
  getRunSummary,
  listCandidates,
  listPromptVersions,
  listRunLogs,
  listRuns,
  listSampleVersions,
  PromptVersionResponse,
  RunLogResponse,
  RunResponse,
  RunSummaryResponse,
  SampleVersionResponse,
  TermCandidateResponse,
} from "@/lib/ai-vocabulary-api";

const RECENT_RUNS_KEY = "ai-vocabulary-recent-runs";
const RUN_PAGE_SIZE = 5;

type RunRecord = {
  run: RunResponse;
  summary: RunSummaryResponse | null;
};

type RunLogEntry = {
  id: string;
  at: string;
  message: string;
  status: string;
  level?: string | null;
};

function formatNumber(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(getLocale());
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLETE") || normalized === "APPROVED") return "bg-[#dde8c2] text-[#476021]";
  if (normalized.includes("RUN") || normalized.includes("QUEUE")) return "bg-[#f8e8b3] text-[#856e15]";
  if (normalized.includes("FAIL") || normalized.includes("REJECT")) return "bg-[#f2d0c2] text-[#8d4a31]";
  return "bg-[#e8e1d2] text-[#61513c]";
}

function normalizeRunLogs(logs: RunLogResponse[], runStatus: string): RunLogEntry[] {
  return logs.map((log, index) => ({
    id: String(log.id ?? `${log.created_at ?? "log"}:${index}:${log.message}`),
    at: log.created_at ?? new Date().toISOString(),
    message: log.message,
    status: runStatus,
    level: log.level ?? null,
  }));
}

function readRecentRuns() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecentRuns(runIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RECENT_RUNS_KEY, JSON.stringify(runIds.slice(0, 12)));
}

function MetricCard({ title, value, description, tone }: { title: string; value: number; description: string; tone: "dark" | "warm" | "green" | "sand" }) {
  const toneClass =
    tone === "dark"
      ? "bg-[#17322c] text-[#f8f4ea]"
      : tone === "warm"
        ? "bg-[#a34e2e] text-[#fff6ee]"
        : tone === "green"
          ? "bg-[#7b8b49] text-[#f4f7ea]"
          : "bg-[#dccdb2] text-[#17322c]";

  return (
    <div className={`rounded-[22px] p-7 ${toneClass}`}>
      <div className="text-sm font-semibold opacity-85">{title}</div>
      <div className="mt-6 font-serif text-5xl font-bold">{formatCount(value)}</div>
      <div className="mt-3 text-sm opacity-85">{description}</div>
    </div>
  );
}

export default function AiVocabularyConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dataset, setDataset] = useState("gl_demo");
  const [promptVersion, setPromptVersion] = useState("vocab_extract_v1");
  const [provider, setProvider] = useState("ali");
  const [modelName, setModelName] = useState("qwen-plus");
  const [versionName, setVersionName] = useState("smoke_v1");
  const [sampleSize, setSampleSize] = useState(150);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.85);
  const [batchSize, setBatchSize] = useState(2);
  const [temperature, setTemperature] = useState(0.1);
  const [sampleVersionId, setSampleVersionId] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runOffset, setRunOffset] = useState(0);
  const [prompts, setPrompts] = useState<PromptVersionResponse[]>([]);
  const [samples, setSamples] = useState<SampleVersionResponse[]>([]);
  const [recentRuns, setRecentRuns] = useState<RunRecord[]>([]);
  const [runningRuns, setRunningRuns] = useState<RunRecord[]>([]);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [candidates, setCandidates] = useState<TermCandidateResponse[]>([]);
  const [hasMoreRuns, setHasMoreRuns] = useState(false);
  const [runLogEntries, setRunLogEntries] = useState<RunLogEntry[]>([]);
  const [watchRunId, setWatchRunId] = useState<string | null>(null);
  async function refresh(preferredRunIds: string[] = []) {
    setLoading(true);
    setError(null);

    const [promptResult, sampleResult, recentRunResult, runningRunResult, pagedRunResult, candidateResult] = await Promise.all([
      listPromptVersions(),
      listSampleVersions(dataset),
      listRuns({ dataset, limit: 5, offset: 0 }),
      listRuns({ dataset, status: "RUNNING", limit: 5, offset: 0 }),
      listRuns({ dataset, limit: RUN_PAGE_SIZE, offset: runOffset }),
      listCandidates({ dataset }),
    ]);

    setError(
      promptResult.error ?? sampleResult.error ?? recentRunResult.error ?? runningRunResult.error ?? pagedRunResult.error ?? candidateResult.error ?? null
    );

    const nextPrompts = promptResult.data ?? [];
    const nextSamples = [...(sampleResult.data ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const nextCandidates = candidateResult.data ?? [];
    setPrompts(nextPrompts);
    setSamples(nextSamples);
    setCandidates(nextCandidates);

    if (!promptVersion && nextPrompts[0]?.prompt_version) setPromptVersion(nextPrompts[0].prompt_version);
    if (nextSamples.length && !nextSamples.some((item) => item.id === sampleVersionId)) setSampleVersionId(nextSamples[0].id);

    const candidateRunIds = nextCandidates.map((item) => item.ai_run_id).filter((item): item is string => Boolean(item));
    const recentRunItems = (recentRunResult.data ?? []).slice(0, 5);
    const runningRunItems = (runningRunResult.data ?? []).slice(0, 5);
    const pagedRunItems = (pagedRunResult.data ?? []).slice(0, RUN_PAGE_SIZE);
    const listedRuns = [...recentRunItems, ...runningRunItems, ...pagedRunItems];
    const runMap = new Map(listedRuns.map((item) => [item.id, item] as const));
    const mergedRunIds = Array.from(new Set([...listedRuns.map((item) => item.id), ...preferredRunIds, ...readRecentRuns(), ...candidateRunIds])).slice(0, 12);

    const resolved = await Promise.all(
      mergedRunIds.map(async (runId) => {
        const seedRun = runMap.get(runId);
        const runResult = seedRun
          ? { data: seedRun, error: null }
          : await getRun(runId);
        if (!runResult.data) return null;
        return { run: runResult.data, summary: null } satisfies RunRecord;
      })
    );

    const records = resolved.filter(Boolean) as RunRecord[];
    const project = (items: RunResponse[]) =>
      items.reduce<RunRecord[]>((acc, item) => {
        const match = records.find((record) => record.run.id === item.id);
        if (match) acc.push(match);
        return acc;
      }, []);
    const nextRecent = project(recentRunItems);
    const nextRunning = project(runningRunItems);
    const nextPaged = project(pagedRunItems);

    setRecentRuns(nextRecent);
    setRunningRuns(nextRunning);
    setRuns(nextPaged);
    setHasMoreRuns((pagedRunResult.data ?? []).length >= RUN_PAGE_SIZE);

    const pool = [...nextRecent, ...nextPaged, ...nextRunning];
    if (pool.length && !pool.some((item) => item.run.id === selectedRunId)) setSelectedRunId(pool[0].run.id);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [dataset, runOffset]);

  const selectedSample = useMemo(() => samples.find((item) => item.id === sampleVersionId) ?? samples[0] ?? null, [samples, sampleVersionId]);
  const selectedRun = useMemo(() => {
    const pool = [...recentRuns, ...runs, ...runningRuns];
    return pool.find((item) => item.run.id === selectedRunId) ?? pool[0] ?? null;
  }, [recentRuns, runs, runningRuns, selectedRunId]);

  useEffect(() => {
    if (!selectedRun) {
      setRunLogEntries([]);
      return;
    }

    void listRunLogs(selectedRun.run.id, 5).then((result) => {
      if (!result.data) return;
      setRunLogEntries(normalizeRunLogs(result.data, selectedRun.run.status));
    });
  }, [selectedRun?.run.id, selectedRun?.run.status]);

  useEffect(() => {
    if (!selectedRunId || !selectedRun) return;
    const normalized = selectedRun.run.status.toUpperCase();
    if (!normalized.includes("RUN") && !normalized.includes("QUEUE")) return;

    const timer = window.setInterval(async () => {
      const [runResult, summaryResult, logResult] = await Promise.all([
        getRun(selectedRunId),
        getRunSummary(selectedRunId),
        listRunLogs(selectedRunId, 5),
      ]);
      if (!runResult.data) return;

      setRecentRuns((current) =>
        current.map((item) =>
          item.run.id === selectedRunId
            ? { run: runResult.data as RunResponse, summary: item.summary }
            : item
        )
      );
      setRunningRuns((current) =>
        current.map((item) =>
          item.run.id === selectedRunId
            ? {
                run: runResult.data as RunResponse,
                summary:
                  summaryResult.data ?? item.summary,
              }
            : item
        )
      );
      setRuns((current) =>
        current.map((item) =>
          item.run.id === selectedRunId
            ? {
                run: runResult.data as RunResponse,
                summary:
                  summaryResult.data ?? item.summary,
              }
            : item
        )
      );
      if (logResult.data) {
        setRunLogEntries(normalizeRunLogs(logResult.data, runResult.data.status));
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [selectedRunId, selectedRun]);

  useEffect(() => {
    if (!selectedRunId) return;

    void getRunSummary(selectedRunId).then((summaryResult) => {
      if (!summaryResult.data) return;
      const patchRecord = (item: RunRecord) =>
        item.run.id === selectedRunId
          ? { ...item, summary: summaryResult.data }
          : item;

      setRecentRuns((current) => current.map(patchRecord));
      setRunningRuns((current) => current.map(patchRecord));
      setRuns((current) => current.map(patchRecord));
    });
  }, [selectedRunId]);

  useEffect(() => {
    if (!watchRunId) return;

    let stopped = false;

    const poll = async () => {
      const [runResult, summaryResult, logResult] = await Promise.all([
        getRun(watchRunId),
        getRunSummary(watchRunId),
        listRunLogs(watchRunId, 5),
      ]);
      if (stopped || !runResult.data) return;

      setSelectedRunId(watchRunId);
      setRunLogEntries(
        logResult.data ? normalizeRunLogs(logResult.data, runResult.data.status) : []
      );

      const patchRecord = (item: RunRecord) =>
        item.run.id === watchRunId
          ? {
              run: runResult.data as RunResponse,
              summary: summaryResult.data ?? item.summary,
            }
          : item;

      setRecentRuns((current) => current.map(patchRecord));
      setRunningRuns((current) => {
        const next = current.map(patchRecord);
        if (!next.some((item) => item.run.id === watchRunId)) {
          next.unshift({
            run: runResult.data as RunResponse,
            summary: summaryResult.data ?? null,
          });
        }
        return next;
      });
      setRuns((current) => current.map(patchRecord));

      const normalized = runResult.data.status.toUpperCase();
      if (!normalized.includes("RUN") && !normalized.includes("QUEUE")) {
        setWatchRunId(null);
        return;
      }

      window.setTimeout(() => {
        if (!stopped) void poll();
      }, 5000);
    };

    void poll();

    return () => {
      stopped = true;
    };
  }, [watchRunId]);

  async function handleGenerateSample() {
    setMutating("generate");
    setInfo(null);
    setError(null);
    const result = await generateSample({ dataset, version_name: versionName, sample_type: "BASE", candidate_pool_size: 2000, sample_size: sampleSize, similarity_threshold: similarityThreshold });
    if (result.error || !result.data) {
      setError(result.error ?? t("aiVocabulary.console.generateFailed"));
      setMutating(null);
      return;
    }
    setSampleVersionId(result.data.id);
    setInfo(t("aiVocabulary.console.generateSuccess", { name: result.data.version_name }));
    setMutating(null);
    await refresh();
  }

  async function handleCreateRun() {
    if (!selectedSample) {
      setError(t("aiVocabulary.console.selectSampleRequired"));
      return;
    }
    setMutating("create-run");
    setInfo(null);
    setError(null);
    const result = await createRun({ dataset, sample_version_id: selectedSample.id, prompt_version: promptVersion, provider, model_name: modelName, temperature, batch_size: batchSize });
    if (result.error || !result.data) {
      setError(result.error ?? t("aiVocabulary.console.createRunFailed"));
      setMutating(null);
      return;
    }
    const nextRunIds = [result.data.id, ...readRecentRuns()];
    writeRecentRuns(nextRunIds);
    setSelectedRunId(result.data.id);
    setInfo(t("aiVocabulary.console.createRunSuccess", { name: result.data.run_key }));
    setMutating(null);
    await refresh(nextRunIds);
  }

  async function handleExecuteRun() {
    if (!selectedRunId) {
      setError(t("aiVocabulary.console.executeRunFailed"));
      return;
    }
    setMutating("execute");
    setInfo(null);
    setError(null);
    const result = await executeRun(selectedRunId, "async");
    if (result.error) {
      setError(result.error);
      setMutating(null);
      return;
    }
    setWatchRunId(selectedRunId);
    setInfo(t("aiVocabulary.console.executeRunSuccess", { name: selectedRunId }));
    setMutating(null);
    await refresh([selectedRunId, ...readRecentRuns()]);
  }
  return (
    <div className="min-h-full overflow-auto bg-[#f3f0e8] p-6 text-[#17322c]">
      <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fcfaf5] shadow-[0_24px_80px_rgba(23,50,44,0.08)]">
        <div className="rounded-t-[28px] bg-[#17322c] px-10 py-7 text-[#f8f4ea]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-serif text-4xl font-bold">{t("aiVocabulary.console.title")}</div>
              <div className="mt-2 text-sm text-[#d8e6df]">{t("aiVocabulary.console.subtitle")}</div>
            </div>
            <button type="button" className="rounded-full border border-[#d8e6df]/30 px-4 py-2 text-sm text-[#f8f4ea] transition hover:bg-white/10" onClick={() => router.push(`/knowledge/glossary/ai-review?dataset=${encodeURIComponent(dataset)}`)}>{t("aiVocabulary.console.openReview")}</button>
          </div>
        </div>

        <div className="space-y-8 p-8">
          {(error || info) && <div className={`rounded-[20px] border px-5 py-4 text-sm ${error ? "border-[#f2d0c2] bg-[#fbf2ef] text-[#8d4a31]" : "border-[#dde8c2] bg-[#eef5dc] text-[#476021]"}`}>{error ?? info}</div>}

          <div className="rounded-[22px] bg-[#e8e1d2] p-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr]">
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.dataset")}</div><input className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={dataset} onChange={(e) => setDataset(e.target.value)} /></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.prompt")}</div><select className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={promptVersion} onChange={(e) => setPromptVersion(e.target.value)}>{prompts.map((item) => <option key={item.id} value={item.prompt_version}>{item.prompt_version}</option>)}{!prompts.length && <option value={promptVersion}>{promptVersion}</option>}</select></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.provider")}</div><input className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={provider} onChange={(e) => setProvider(e.target.value)} /></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.model")}</div><input className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={modelName} onChange={(e) => setModelName(e.target.value)} /></label>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_160px_160px_160px_160px]">
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.sampleVersion")}</div><select className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={sampleVersionId} onChange={(e) => setSampleVersionId(e.target.value)}>{samples.map((item) => <option key={item.id} value={item.id}>{item.version_name}</option>)}{!samples.length && <option value="">{t("aiVocabulary.samples.noSample")}</option>}</select></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.sampleSize")}</div><input type="number" className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} /></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.threshold")}</div><input type="number" step="0.01" className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={similarityThreshold} onChange={(e) => setSimilarityThreshold(Number(e.target.value))} /></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.batchSize")}</div><input type="number" className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} /></label>
              <label className="text-sm"><div className="mb-2 font-semibold text-[#4e4334]">{t("aiVocabulary.form.temperature")}</div><input type="number" step="0.1" className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} /></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="text-sm"><span className="mr-3 font-semibold text-[#4e4334]">{t("aiVocabulary.form.versionName")}</span><input className="h-10 rounded-full bg-[#fcfaf5] px-4 outline-none" value={versionName} onChange={(e) => setVersionName(e.target.value)} /></label>
              <button type="button" className="rounded-full bg-[#17322c] px-5 py-2.5 text-sm font-semibold text-[#f8f4ea] disabled:opacity-50" disabled={mutating !== null} onClick={handleGenerateSample}>{mutating === "generate" ? t("aiVocabulary.action.generating") : t("aiVocabulary.action.generate")}</button>
              <button type="button" className="rounded-full bg-[#a34e2e] px-5 py-2.5 text-sm font-semibold text-[#fff6ee] disabled:opacity-50" disabled={mutating !== null} onClick={handleCreateRun}>{mutating === "create-run" ? t("aiVocabulary.action.creatingRun") : t("aiVocabulary.action.createRun")}</button>
              <button type="button" className="rounded-full bg-[#7b8b49] px-5 py-2.5 text-sm font-semibold text-[#f6f9ea] disabled:opacity-50" disabled={mutating !== null} onClick={handleExecuteRun}>{mutating === "execute" ? t("aiVocabulary.action.queueing") : t("aiVocabulary.action.execute")}</button>
              <button type="button" className="rounded-full bg-[#c9b89d] px-5 py-2.5 text-sm font-semibold text-[#4e4334]" onClick={() => void refresh([selectedRunId, ...readRecentRuns()].filter(Boolean))}>{t("aiVocabulary.action.refresh")}</button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <MetricCard title={t("aiVocabulary.metric.sampleVersions")} value={samples.length} description={t("aiVocabulary.metric.sampleVersionsDesc")} tone="dark" />
            <MetricCard title={t("aiVocabulary.metric.latestSampleSize")} value={samples[0]?.final_sample_size ?? 0} description={t("aiVocabulary.metric.latestSampleSizeDesc")} tone="warm" />
            <MetricCard title={t("aiVocabulary.metric.runs")} value={recentRuns.length} description={t("aiVocabulary.metric.runsDesc")} tone="green" />
            <MetricCard title={t("aiVocabulary.metric.candidates")} value={candidates.length} description={t("aiVocabulary.metric.candidatesDesc")} tone="sand" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1.08fr]">
            <section className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-serif text-3xl font-bold">{t("aiVocabulary.samples.title")}</div>
                  <div className="mt-2 max-w-3xl text-sm text-[#72604a]">{t("aiVocabulary.samples.subtitle")}</div>
                </div>
                {selectedSample && <div className="rounded-[18px] bg-[#f7f2e8] px-4 py-3 text-sm text-[#5f533f]"><div className="font-semibold">{selectedSample.version_name}</div><div className="mt-1">{t("aiVocabulary.samples.avgSimilarity", { value: formatNumber(selectedSample.avg_similarity) })}</div><div>{t("aiVocabulary.samples.minSimilarity", { value: formatNumber(selectedSample.min_similarity) })}</div><div>{t("aiVocabulary.samples.clusterEstimate", { value: formatCount(selectedSample.cluster_count_estimate) })}</div></div>}
              </div>
              <div className="mt-6 overflow-hidden rounded-[20px] border border-[#e7decf]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbf8f2] text-[#6c5944]"><tr><th className="px-4 py-3">{t("aiVocabulary.samples.version")}</th><th className="px-4 py-3">{t("aiVocabulary.samples.type")}</th><th className="px-4 py-3">{t("aiVocabulary.samples.size")}</th><th className="px-4 py-3">{t("aiVocabulary.samples.threshold")}</th><th className="px-4 py-3">{t("aiVocabulary.samples.explainability")}</th><th className="px-4 py-3">{t("aiVocabulary.samples.action")}</th></tr></thead>
                  <tbody>
                    {samples.map((sample) => {
                      const active = selectedSample?.id === sample.id;
                      return <tr key={sample.id} className={active ? "bg-[#f7f2e8]" : "bg-white"}><td className="px-4 py-4 font-medium">{sample.version_name}</td><td className="px-4 py-4">{sample.sample_type}</td><td className="px-4 py-4">{formatCount(sample.final_sample_size)}</td><td className="px-4 py-4">{formatNumber(sample.similarity_threshold)}</td><td className="px-4 py-4 text-xs text-[#72604a]">{formatNumber(sample.avg_similarity)} / {formatNumber(sample.min_similarity)}</td><td className="px-4 py-4"><button type="button" className={`rounded-full px-4 py-2 text-xs font-semibold ${active ? "bg-[#17322c] text-[#f8f4ea]" : "bg-[#c9b89d] text-[#4f4437]"}`} onClick={() => setSampleVersionId(sample.id)}>{active ? t("aiVocabulary.action.using") : t("aiVocabulary.action.use")}</button></td></tr>;
                    })}
                    {!samples.length && <tr><td className="px-4 py-8 text-center text-[#72604a]" colSpan={6}>{loading ? t("common.loading") : t("aiVocabulary.samples.empty")}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div><div className="font-serif text-3xl font-bold">{t("aiVocabulary.runs.title")}</div><div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.runs.subtitle")}</div></div>
                  {selectedRun && <button type="button" className="rounded-full bg-[#17322c] px-4 py-2 text-xs font-semibold text-[#f8f4ea]" onClick={() => router.push(`/knowledge/operations/ai-vocabulary/runs/${encodeURIComponent(selectedRun.run.id)}`)}>{t("aiVocabulary.action.openSelected")}</button>}
                </div>
                <div className="mt-6 space-y-4">
                  {!!recentRuns.length && <div className="space-y-3"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c5944]">{t("aiVocabulary.runs.recent")}</div>{recentRuns.slice(0, 3).map((record) => <div key={`recent-${record.run.id}`} className="rounded-[18px] bg-[#f7f2e8] p-4"><div className="flex items-center justify-between gap-3"><button type="button" className="text-sm font-semibold hover:underline" onClick={() => setSelectedRunId(record.run.id)}>{record.run.run_key}</button><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(record.run.status)}`}>{record.run.status}</span></div><div className="mt-2 text-xs text-[#736450]">{record.run.dataset} / {record.run.provider}:{record.run.model_name}{record.run.max_chunks_per_doc != null ? ` / ${t("aiVocabulary.runs.maxChunks", { value: formatCount(record.run.max_chunks_per_doc) })}` : ""}</div></div>)}</div>}
                  {!!runningRuns.length && <div className="space-y-3"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c5944]">{t("aiVocabulary.runs.running")}</div><div className="grid gap-3 lg:grid-cols-2">{runningRuns.slice(0, 2).map((record) => <div key={`running-${record.run.id}`} className="rounded-[18px] bg-[#17322c] p-5 text-[#f8f4ea]"><div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{record.run.run_key}</div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(record.run.status)}`}>{record.run.status}</span></div><div className="mt-3 text-sm text-[#d7e5df]">{t("aiVocabulary.runs.samplesProgress", { processed: formatCount(record.run.processed_samples), total: formatCount(record.run.total_samples) })}</div><div className="mt-2 text-xs text-[#d7e5df]">{t("aiVocabulary.runs.heartbeat", { value: formatDate(record.run.last_heartbeat_at) })}</div></div>)}</div></div>}
                  {!!runs.length && <div className="space-y-3"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6c5944]">{t("aiVocabulary.runs.all")}</div>{runs.map((record) => { const active = selectedRun?.run.id === record.run.id; return <div key={record.run.id} className={`rounded-[18px] border p-5 transition ${active ? "border-[#17322c] bg-[#f7f2e8]" : "border-[#e7decf] bg-[#fbf8f2]"}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><button type="button" className="text-left text-sm font-semibold underline-offset-4 hover:underline" onClick={() => setSelectedRunId(record.run.id)}>{record.run.run_key}</button><div className="text-sm text-[#736450]">{record.run.dataset} / {record.run.provider}:{record.run.model_name}</div><div className="text-xs text-[#8a7a63]">{t("aiVocabulary.runs.batchProgress", { batch: formatCount(record.run.batch_size), processed: formatCount(record.run.processed_samples), total: formatCount(record.run.total_samples) })}</div></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(record.run.status)}`}>{record.run.status}</span><div className="text-right text-xs text-[#6f614c]"><div>{t("aiVocabulary.runs.terms", { value: formatCount(record.summary?.valid_term_count ?? record.run.total_terms) })}</div><div>{t("aiVocabulary.runs.candidates", { value: formatCount(record.summary?.candidate_count) })}</div><div>{t("aiVocabulary.runs.heartbeat", { value: formatDate(record.run.last_heartbeat_at) })}</div></div><button type="button" className="rounded-full bg-[#17322c] px-4 py-2 text-xs font-semibold text-[#f8f4ea]" onClick={() => router.push(`/knowledge/operations/ai-vocabulary/runs/${encodeURIComponent(record.run.id)}`)}>{t("aiVocabulary.runs.view")}</button></div></div></div>; })}</div>}
                  {!runs.length && <div className="rounded-[18px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">{t("aiVocabulary.runs.empty")}</div>}
                  {!!runs.length && <div className="flex items-center justify-between pt-2 text-sm"><span className="text-[#72604a]">{t("aiVocabulary.runs.page", { value: Math.floor(runOffset / RUN_PAGE_SIZE) + 1 })}</span><div className="flex items-center gap-2"><button type="button" className="rounded-full border border-[#c9b89d] px-4 py-2 text-xs font-semibold text-[#4f4437] disabled:opacity-40" disabled={runOffset === 0 || loading} onClick={() => setRunOffset((current) => Math.max(0, current - RUN_PAGE_SIZE))}>{t("aiVocabulary.runs.prev")}</button><button type="button" className="rounded-full border border-[#c9b89d] px-4 py-2 text-xs font-semibold text-[#4f4437] disabled:opacity-40" disabled={!hasMoreRuns || loading} onClick={() => setRunOffset((current) => current + RUN_PAGE_SIZE)}>{t("aiVocabulary.runs.next")}</button></div></div>}
                </div>
              </div>
              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-serif text-3xl font-bold">{t("aiVocabulary.runs.logTitle")}</div>
                    <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.runs.logSubtitle")}</div>
                  </div>
                  {selectedRun && (
                    <div className="rounded-full bg-[#f7f2e8] px-4 py-2 text-xs font-semibold text-[#5f533f]">
                      {t("aiVocabulary.runs.logStatus", { value: selectedRun.run.status })}
                    </div>
                  )}
                </div>
                <div className="mt-6 space-y-3">
                  {selectedRun?.run.last_progress_message && (
                    <div className="rounded-[18px] bg-[#17322c] p-4 text-[#f8f4ea]">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7e5df]">
                        {t("aiVocabulary.runs.logLatest")}
                      </div>
                      <div className="mt-3 text-sm">{selectedRun.run.last_progress_message}</div>
                      <div className="mt-3 text-xs text-[#d7e5df]">
                        {t("aiVocabulary.runs.heartbeat", {
                          value: formatDate(selectedRun.run.last_heartbeat_at),
                        })}
                      </div>
                    </div>
                  )}
                  {runLogEntries.map((entry) => (
                    <div key={entry.id} className="rounded-[18px] bg-[#fbf8f2] p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-[#6f614c]">
                        <span>{formatDate(entry.at)}</span>
                        <div className="flex items-center gap-2">
                          {entry.level && (
                            <span className="rounded-full bg-[#e8e1d2] px-3 py-1 font-semibold uppercase text-[#5f533f]">
                              {entry.level}
                            </span>
                          )}
                          <span className={`rounded-full px-3 py-1 font-semibold ${statusClass(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-[#17322c]">{entry.message}</div>
                    </div>
                  ))}
                  {!selectedRun?.run.last_progress_message && !runLogEntries.length && (
                    <div className="rounded-[18px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                      {t("aiVocabulary.runs.logEmpty")}
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-[20px] bg-[#17322c] p-8 text-[#f8f4ea]"><div className="font-serif text-2xl font-bold">{t("aiVocabulary.boundary.title")}</div><div className="mt-4 text-sm leading-7 text-[#d7e5df]">{t("aiVocabulary.boundary.subtitle")}</div><div className="mt-5 flex flex-wrap gap-3 text-sm text-[#d7e5df]"><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.sampleGeneration")}</span><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.promptVersioning")}</span><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.syncAsync")}</span><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.rawTerm")}</span><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.evidenceValidation")}</span><span className="rounded-full border border-white/15 px-3 py-1">{t("aiVocabulary.boundary.lifecycle")}</span></div></div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

