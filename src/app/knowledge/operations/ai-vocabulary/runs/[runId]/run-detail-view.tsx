"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackBanner, type FeedbackType } from "@/components/ui/feedback-banner";
import { getLocale, t } from "@/i18n";
import {
  addRawTermToCandidate,
  compareRuns,
  getInvalidBreakdown,
  getPromptVersion,
  getRun,
  getRunSummary,
  getRunTopCandidates,
  ignoreRawTerm,
  listRunLogs,
  listRunTerms,
  PromptVersionResponse,
  rerunRun,
  RunCompareResponse,
  RunLogResponse,
  RunResponse,
  RunSummaryResponse,
  RunTermItemResponse,
  RunTopCandidatesResponse,
  unignoreRawTerm,
} from "@/lib/ai-vocabulary-api";

type RunLogEntry = {
  id: string;
  at: string;
  message: string;
  level?: string | null;
};

type FeedbackState = {
  type: FeedbackType;
  title: string;
  message?: string;
} | null;

type DisplayTerm = RunTermItemResponse & {
  rowId: string;
  displayTerm: string;
  displayEvidence: string;
};

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

function formatNumber(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(getLocale());
}

function formatPercent(value?: number | null, digits = 1) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function decodeUnicodeEscapes(input?: string | null) {
  if (!input) return "";
  const decoded = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
  return decoded.replace(/\\(?![\\/\"'bfnrtu])/g, "");
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "VALID" || normalized.includes("COMPLETE")) {
    return "bg-[#dde8c2] text-[#476021]";
  }
  if (
    normalized.includes("RUN") ||
    normalized.includes("QUEUE") ||
    normalized === "LOW_CONFIDENCE"
  ) {
    return "bg-[#f8e8b3] text-[#856e15]";
  }
  if (
    normalized.includes("FAIL") ||
    normalized.includes("INVALID") ||
    normalized.includes("FILTER") ||
    normalized.includes("NOISE")
  ) {
    return "bg-[#f2d0c2] text-[#8d4a31]";
  }
  return "bg-[#e8e1d2] text-[#5f533f]";
}

function normalizeRunLogs(logs: RunLogResponse[]) {
  return logs.map((log, index) => ({
    id: String(log.id ?? `${log.created_at ?? "log"}:${index}`),
    at: log.created_at ?? new Date().toISOString(),
    message: decodeUnicodeEscapes(log.message),
    level: log.level ?? null,
  }));
}

function highlightTerm(text: string, term: string) {
  if (!term || !text.includes(term)) return text;
  const parts = text.split(term);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${term}-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <mark className="rounded bg-[#f8e8b3] px-1 text-[#17322c]">{term}</mark>
          ) : null}
        </span>
      ))}
    </>
  );
}

function MetaBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#4e4334]">
        {label}
      </div>
      <div className="mt-3 break-words font-serif text-3xl font-bold">{value}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "dark" | "warm" | "green" | "rose";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-[#17322c] text-[#f8f4ea]"
      : tone === "warm"
        ? "bg-[#a34e2e] text-[#fff6ee]"
        : tone === "green"
          ? "bg-[#7b8b49] text-[#f4f7ea]"
          : "bg-[#e6d4c4] text-[#17322c]";
  return (
    <div className={`rounded-[22px] p-6 ${toneClass}`}>
      <div className="text-sm font-semibold opacity-85">{title}</div>
      <div className="mt-6 font-serif text-4xl font-bold">{value}</div>
    </div>
  );
}

function SecondaryMetric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-[#f3ede2] p-5">
      <div className="text-sm font-semibold text-[#5e513f]">{title}</div>
      <div className="mt-4 text-3xl font-semibold text-[#17322c]">{value}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[#f7f2e8] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6c5944]">
        {label}
      </div>
      <div className="mt-2 text-sm leading-6 text-[#17322c]">{value}</div>
    </div>
  );
}

function formatDelta(value?: number | null, digits = 0) {
  if (value == null || Number.isNaN(value)) return "—";
  const fixed = digits > 0 ? value.toFixed(digits) : String(value);
  return value > 0 ? `+${fixed}` : fixed;
}

export function RunDetailView({ runId }: { runId: string }) {
  const router = useRouter();
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [termsLoading, setTermsLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [run, setRun] = useState<RunResponse | null>(null);
  const [summary, setSummary] = useState<RunSummaryResponse | null>(null);
  const [prompt, setPrompt] = useState<PromptVersionResponse | null>(null);
  const [invalidBreakdown, setInvalidBreakdown] =
    useState<Array<{ type: string; count: number }>>([]);
  const [topCandidates, setTopCandidates] = useState<RunTopCandidatesResponse["items"]>([]);
  const [terms, setTerms] = useState<DisplayTerm[]>([]);
  const [termsTotal, setTermsTotal] = useState(0);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const [validationFilter, setValidationFilter] = useState("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState("ANY");
  const [candidateFilter, setCandidateFilter] = useState("ALL");
  const [docIdFilter, setDocIdFilter] = useState("");
  const [termQuery, setTermQuery] = useState("");
  const [sortBy, setSortBy] = useState("confidence");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [rerunPromptVersion, setRerunPromptVersion] = useState("");
  const [rerunProvider, setRerunProvider] = useState("");
  const [rerunModelName, setRerunModelName] = useState("");
  const [rerunTemperature, setRerunTemperature] = useState("");
  const [rerunBatchSize, setRerunBatchSize] = useState("");
  const [compareRunId, setCompareRunId] = useState("");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<RunCompareResponse | null>(null);
  const [termMutatingId, setTermMutatingId] = useState<string | null>(null);

  async function refreshBase() {
    setLoading(true);
    setError(null);

    const [runResult, summaryResult, invalidResult, topCandidateResult, logResult] =
      await Promise.all([
        getRun(runId),
        getRunSummary(runId),
        getInvalidBreakdown(runId),
        getRunTopCandidates(runId, 5),
        listRunLogs(runId, 8),
      ]);

    if (!runResult.data) {
      setError(
        runResult.error ??
          summaryResult.error ??
          invalidResult.error ??
          topCandidateResult.error ??
          t("aiVocabulary.detail.loadFailed")
      );
      setLoading(false);
      return;
    }

    setRun(runResult.data);
    setSummary(summaryResult.data ?? null);
    setInvalidBreakdown(invalidResult.data?.breakdown ?? []);
    setTopCandidates(topCandidateResult.data?.items ?? []);
    setLogs(normalizeRunLogs(logResult.data ?? []));
    setRerunPromptVersion(runResult.data.prompt_version);
    setRerunProvider(runResult.data.provider);
    setRerunModelName(runResult.data.model_name);
    setRerunTemperature(
      runResult.data.temperature != null ? String(runResult.data.temperature) : ""
    );
    setRerunBatchSize(
      runResult.data.batch_size != null ? String(runResult.data.batch_size) : ""
    );

    const promptResult = await getPromptVersion(runResult.data.prompt_version);
    setPrompt(promptResult.data ?? null);

    if (
      summaryResult.error ||
      invalidResult.error ||
      topCandidateResult.error ||
      logResult.error ||
      promptResult.error
    ) {
      setError(
        summaryResult.error ??
          invalidResult.error ??
          topCandidateResult.error ??
          logResult.error ??
          promptResult.error ??
          null
      );
    }

    setLoading(false);
  }

  async function refreshTerms() {
    setTermsLoading(true);
    const minConfidence =
      confidenceFilter === "ANY" ? undefined : Number(confidenceFilter);
    const hasCandidate =
      candidateFilter === "ALL" ? undefined : candidateFilter === "YES";

    const result = await listRunTerms(runId, {
      validationStatus: validationFilter === "ALL" ? undefined : validationFilter,
      confidenceMin: minConfidence,
      hasCandidate,
      docId: docIdFilter.trim() || undefined,
      term: termQuery.trim() || undefined,
      sortBy,
      sortOrder,
      page,
      size: pageSize,
    });

    if (result.error) {
      setError(result.error);
      setTerms([]);
      setTermsTotal(0);
      setTermsLoading(false);
      return;
    }

    const items = (result.data?.items ?? []).map((item, index) => ({
      ...item,
      rowId: `${item.docId}:${item.chunkId}:${item.term}:${index}`,
      displayTerm: decodeUnicodeEscapes(item.term).trim() || item.term,
      displayEvidence: decodeUnicodeEscapes(item.evidence).trim() || item.evidence,
    }));
    setTerms(items);
    setTermsTotal(result.data?.total ?? 0);
    setTermsLoading(false);
  }

  useEffect(() => {
    void refreshBase();
  }, [runId]);

  useEffect(() => {
    void refreshTerms();
  }, [
    runId,
    validationFilter,
    confidenceFilter,
    candidateFilter,
    docIdFilter,
    termQuery,
    sortBy,
    sortOrder,
    page,
  ]);

  useEffect(() => {
    if (!run) return;
    const normalized = run.status.toUpperCase();
    if (!normalized.includes("RUN") && !normalized.includes("QUEUE")) return;
    const timer = window.setInterval(() => {
      void refreshBase();
      void refreshTerms();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [run, runId, validationFilter, confidenceFilter, candidateFilter, docIdFilter, termQuery, sortBy, sortOrder, page]);

  useEffect(() => {
    setPage(1);
  }, [validationFilter, confidenceFilter, candidateFilter, docIdFilter, termQuery, sortBy, sortOrder]);

  useEffect(() => {
    if (!selectedTermId && terms.length) {
      setSelectedTermId(terms[0].rowId);
    }
    if (selectedTermId && !terms.some((item) => item.rowId === selectedTermId)) {
      setSelectedTermId(terms[0]?.rowId ?? null);
    }
  }, [terms, selectedTermId]);

  if (!run && loading) {
    return (
      <div className="min-h-full overflow-auto bg-[#f1efe7] p-6">
        <div className="mx-auto max-w-[1580px] rounded-[28px] bg-[#fbfaf6] p-10 text-[#17322c]">
          {t("aiVocabulary.detail.loading")}
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-full overflow-auto bg-[#f1efe7] p-6">
        <div className="mx-auto max-w-[1580px] rounded-[28px] bg-[#fbfaf6] p-10 text-[#8d4a31]">
          {error ?? t("aiVocabulary.detail.unavailable")}
        </div>
      </div>
    );
  }

  const metrics = summary?.metrics;
  const runData = run;
  const selectedTerm = terms.find((item) => item.rowId === selectedTermId) ?? null;
  const pageCount = Math.max(1, Math.ceil(termsTotal / pageSize));
  const qualityScore = metrics?.validRate ?? 0;

  async function handleRerun() {
    setRerunning(true);
    setFeedback(null);
    setError(null);
    const result = await rerunRun(runData.id, {
      promptVersion: rerunPromptVersion || null,
      provider: rerunProvider || null,
      modelName: rerunModelName || null,
      temperature:
        rerunTemperature.trim() === "" ? null : Number(rerunTemperature),
      batchSize: rerunBatchSize.trim() === "" ? null : Number(rerunBatchSize),
    });
    if (result.error || !result.data) {
      setError(result.error ?? t("aiVocabulary.detail.rerunFailed"));
      setRerunning(false);
      return;
    }
    router.push(
      `/knowledge/operations/ai-vocabulary/runs/${encodeURIComponent(result.data.id)}`
    );
  }

  function handleExportJson() {
    const payload = {
      exported_at: new Date().toISOString(),
      run: runData,
      summary,
      invalid_breakdown: invalidBreakdown,
      top_candidates: topCandidates,
      current_terms_page: {
        page,
        size: pageSize,
        total: termsTotal,
        items: terms,
      },
      logs,
      prompt,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${runData.run_key || runData.id}-detail.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback({
      type: "success",
      title: t("aiVocabulary.detail.exportReady"),
      message: `${runData.run_key || runData.id}.json`,
    });
  }

  async function handleCompareRun() {
    if (!compareRunId.trim()) {
      setFeedback({
        type: "info",
        title: t("aiVocabulary.detail.compareRun"),
        message: t("aiVocabulary.detail.compareInputRequired"),
      });
      return;
    }
    setCompareLoading(true);
    setFeedback(null);
    const result = await compareRuns(runData.id, compareRunId.trim());
    if (result.error || !result.data) {
      setFeedback({
        type: "error",
        title: result.error ?? t("aiVocabulary.detail.compareFailed"),
      });
      setCompareLoading(false);
      return;
    }
    setCompareResult(result.data);
    setCompareLoading(false);
  }

  function openCandidate(candidateId: number) {
    router.push(
      `/knowledge/glossary/ai-review?dataset=${encodeURIComponent(
        runData.dataset
      )}&run=${encodeURIComponent(runData.id)}&candidate=${candidateId}`
    );
  }

  async function handleAddToCandidate(term: DisplayTerm) {
    if (term.candidateId) {
      openCandidate(term.candidateId);
      return;
    }
    setTermMutatingId(term.rawTermId);
    const result = await addRawTermToCandidate(term.rawTermId);
    if (result.error) {
      setFeedback({ type: "error", title: result.error });
      setTermMutatingId(null);
      return;
    }
    if (result.data?.candidateId) {
      setFeedback({
        type: "success",
        title: t("aiVocabulary.detail.addCandidateSuccess"),
        message: term.displayTerm,
      });
      await refreshTerms();
      await refreshBase();
      openCandidate(result.data.candidateId);
      setTermMutatingId(null);
      return;
    }
    setTermMutatingId(null);
  }

  async function handleIgnoreTerm(term: DisplayTerm) {
    setTermMutatingId(term.rawTermId);
    const action = term.validationStatus.toUpperCase() === "IGNORED" ? unignoreRawTerm : ignoreRawTerm;
    const result = await action(term.rawTermId);
    if (result.error) {
      setFeedback({ type: "error", title: result.error });
      setTermMutatingId(null);
      return;
    }
    setFeedback({
      type: "success",
      title:
        term.validationStatus.toUpperCase() === "IGNORED"
          ? t("aiVocabulary.detail.unignoreSuccess")
          : t("aiVocabulary.detail.ignoreSuccess"),
      message: term.displayTerm,
    });
    await refreshTerms();
    await refreshBase();
    setTermMutatingId(null);
  }

  const contextTerms = selectedTerm
    ? terms.filter(
        (item) =>
          item.docId === selectedTerm.docId && item.chunkId === selectedTerm.chunkId
      )
    : [];

  const contextPrev =
    contextTerms.find((item) => item.rowId !== selectedTerm?.rowId)?.displayEvidence ??
    "API pending";
  const contextNext =
    [...contextTerms]
      .reverse()
      .find((item) => item.rowId !== selectedTerm?.rowId)?.displayEvidence ?? "API pending";

  return (
    <div className="min-h-full overflow-auto bg-[#f1efe7] p-6 text-[#17322c]">
      <div className="mx-auto max-w-[1580px] rounded-[28px] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(23,50,44,0.08)]">
        <div className="rounded-t-[28px] bg-[#17322c] px-10 py-7 text-[#f8f4ea]">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <button
                type="button"
                className="text-sm text-[#d8e6df] underline-offset-4 hover:underline"
                onClick={() => router.push("/knowledge/operations/ai-vocabulary")}
              >
                {t("aiVocabulary.detail.back")}
              </button>
              <div className="mt-2 font-serif text-4xl font-bold">
                {t("aiVocabulary.detail.title")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[#d8e6df]">{runData.run_key}</div>
              <div className="mt-2 text-2xl font-semibold text-[#f6df9f]">
                {t("aiVocabulary.detail.qualityScore")} {formatPercent(qualityScore)}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 p-8">
          {error && <FeedbackBanner type="error" title={error} />}
          {feedback && (
            <FeedbackBanner
              type={feedback.type}
              title={feedback.title}
              message={feedback.message}
              onDismiss={() => setFeedback(null)}
            />
          )}

          <section className="rounded-[24px] bg-[#e8e1d2] p-7">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <MetaBlock label={t("aiVocabulary.detail.dataset")} value={summary?.dataset ?? runData.dataset} />
              <MetaBlock
                label={t("aiVocabulary.detail.sampleVersion")}
                value={summary?.sampleVersion ?? runData.sample_version_id}
              />
              <MetaBlock
                label={t("aiVocabulary.detail.promptVersion")}
                value={summary?.promptVersion ?? runData.prompt_version}
              />
              <MetaBlock
                label={t("aiVocabulary.detail.model")}
                value={summary?.model ?? `${runData.provider} / ${runData.model_name}`}
              />
              <div className="flex items-start justify-end">
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(summary?.status ?? runData.status)}`}>
                  {summary?.status ?? runData.status}
                </span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-[#6f624e]">
                {t("aiVocabulary.detail.meta", {
                  createdAt: formatDate(summary?.createdAt ?? runData.created_at),
                  batchSize: runData.batch_size ?? "—",
                  temperature: runData.temperature ?? "—",
                  maxChunks: runData.max_chunks_per_doc ?? "—",
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={rerunning}
                  className="rounded-full bg-[#17322c] px-4 py-2 text-sm font-semibold text-[#f8f4ea] disabled:opacity-60"
                  onClick={handleRerun}
                >
                  {rerunning ? t("aiVocabulary.detail.rerunning") : t("aiVocabulary.detail.rerun")}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#c9b89d] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                  onClick={handleExportJson}
                >
                  {t("aiVocabulary.detail.exportJson")}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#9a8769] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                  onClick={handleCompareRun}
                >
                  {compareLoading ? t("aiVocabulary.detail.comparing") : t("aiVocabulary.detail.compareRun")}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-6">
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.rerunPrompt")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={rerunPromptVersion}
                  onChange={(e) => setRerunPromptVersion(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.rerunProvider")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={rerunProvider}
                  onChange={(e) => setRerunProvider(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.rerunModel")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={rerunModelName}
                  onChange={(e) => setRerunModelName(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.rerunTemperature")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={rerunTemperature}
                  onChange={(e) => setRerunTemperature(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.rerunBatch")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={rerunBatchSize}
                  onChange={(e) => setRerunBatchSize(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">
                  {t("aiVocabulary.detail.compareTarget")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fbfaf6] px-4 outline-none"
                  value={compareRunId}
                  onChange={(e) => setCompareRunId(e.target.value)}
                  placeholder={t("aiVocabulary.detail.compareTargetPlaceholder")}
                />
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-4">
              <MetricCard tone="dark" title={t("aiVocabulary.detail.totalSamples")} value={formatCount(metrics?.totalSamples)} />
              <MetricCard tone="warm" title={t("aiVocabulary.detail.rawTerms")} value={formatCount(metrics?.rawTerms)} />
              <MetricCard tone="green" title={t("aiVocabulary.detail.validTerms")} value={formatCount(metrics?.validTerms)} />
              <MetricCard tone="rose" title={t("aiVocabulary.detail.termCandidates")} value={formatCount(metrics?.candidates)} />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              <SecondaryMetric title={t("aiVocabulary.detail.validRate")} value={formatPercent(metrics?.validRate)} />
              <SecondaryMetric title={t("aiVocabulary.detail.evidenceFailRate")} value={formatPercent(metrics?.evidenceFailRate)} />
              <SecondaryMetric title={t("aiVocabulary.detail.noiseRate")} value={formatPercent(metrics?.noiseRate)} />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-serif text-2xl font-bold">{t("aiVocabulary.detail.invalidBreakdown")}</div>
                  <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.invalidBreakdownSubtitle")}</div>
                </div>
                {validationFilter !== "ALL" && (
                  <button type="button" className="text-sm font-semibold text-[#7a674f]" onClick={() => setValidationFilter("ALL")}>
                    {t("aiVocabulary.detail.clearFilter")}
                  </button>
                )}
              </div>
              <div className="mt-6 space-y-3">
                {invalidBreakdown.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-sm ${
                      validationFilter === item.type
                        ? "bg-[#17322c] text-[#f8f4ea]"
                        : "bg-[#fbf8f2] text-[#17322c] hover:bg-[#f3ede2]"
                    }`}
                    onClick={() => setValidationFilter((current) => (current === item.type ? "ALL" : item.type))}
                  >
                    <span>{item.type}</span>
                    <span className="font-semibold">{formatCount(item.count)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="font-serif text-2xl font-bold">{t("aiVocabulary.detail.topCandidatesTitle")}</div>
              <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.topCandidatesSubtitle")}</div>
              <div className="mt-6 space-y-3">
                {topCandidates.map((candidate, index) => (
                  <div key={candidate.candidateId} className="flex items-center justify-between gap-4 rounded-[18px] bg-[#f7f2e8] p-4">
                    <div>
                      <div className="text-sm text-[#6b5a45]">{index + 1}. {candidate.term}</div>
                      <div className="mt-1 text-xs text-[#7b6952]">
                        {t("aiVocabulary.detail.topCandidateMeta", {
                          docs: "—",
                          evidence: formatCount(candidate.evidenceCount),
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-[#17322c] px-3 py-2 text-xs font-semibold text-[#f8f4ea]"
                      onClick={() => openCandidate(candidate.candidateId)}
                    >
                      {t("aiVocabulary.detail.viewCandidate")}
                    </button>
                  </div>
                ))}
                {!topCandidates.length && (
                  <div className="rounded-[16px] bg-[#fbf8f2] px-4 py-3 text-sm text-[#72604a]">
                    {t("aiVocabulary.detail.candidatesEmpty")}
                  </div>
                )}
              </div>
            </div>
          </section>

          {compareResult && (
            <section className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-serif text-2xl font-bold">
                    {t("aiVocabulary.detail.compareRun")}
                  </div>
                  <div className="mt-2 text-sm text-[#72604a]">
                    {compareResult.baseRun.runId} → {compareResult.targetRun.runId}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-[#7a674f]"
                  onClick={() => setCompareResult(null)}
                >
                  {t("aiVocabulary.detail.clearFilter")}
                </button>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <div className="rounded-[20px] bg-[#f7f2e8] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6c5944]">
                    Base Run
                  </div>
                  <div className="mt-3 font-serif text-2xl font-bold">
                    {compareResult.baseRun.runId}
                  </div>
                  <div className="mt-2 text-sm text-[#6f624e]">
                    {compareResult.baseRun.dataset} · {compareResult.baseRun.sampleVersion}
                  </div>
                  <div className="mt-1 text-sm text-[#6f624e]">
                    {compareResult.baseRun.promptVersion} · {compareResult.baseRun.model}
                  </div>
                  <div className="mt-1 text-sm text-[#6f624e]">
                    {compareResult.baseRun.status} · {formatDate(compareResult.baseRun.createdAt)}
                  </div>
                </div>
                <div className="rounded-[20px] bg-[#eef5dc] p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5e6e38]">
                    Target Run
                  </div>
                  <div className="mt-3 font-serif text-2xl font-bold">
                    {compareResult.targetRun.runId}
                  </div>
                  <div className="mt-2 text-sm text-[#52603d]">
                    {compareResult.targetRun.dataset} · {compareResult.targetRun.sampleVersion}
                  </div>
                  <div className="mt-1 text-sm text-[#52603d]">
                    {compareResult.targetRun.promptVersion} · {compareResult.targetRun.model}
                  </div>
                  <div className="mt-1 text-sm text-[#52603d]">
                    {compareResult.targetRun.status} · {formatDate(compareResult.targetRun.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-4">
                <SecondaryMetric title={t("aiVocabulary.detail.rawTerms")} value={formatDelta(compareResult.metricsDiff.rawTerms)} />
                <SecondaryMetric title={t("aiVocabulary.detail.validTerms")} value={formatDelta(compareResult.metricsDiff.validTerms)} />
                <SecondaryMetric title={t("aiVocabulary.detail.termCandidates")} value={formatDelta(compareResult.metricsDiff.candidates)} />
                <SecondaryMetric title={t("aiVocabulary.detail.validRate")} value={formatDelta(compareResult.metricsDiff.validRate * 100, 2) + "%"} />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b5a45]">
                    {t("aiVocabulary.detail.invalidBreakdown")}
                  </div>
                  <div className="mt-3 space-y-3">
                    {compareResult.invalidBreakdownDiff.map((item) => (
                      <div key={item.type} className="rounded-[16px] bg-[#f7f2e8] p-4 text-sm">
                        <div className="font-semibold">{item.type}</div>
                        <div className="mt-1 text-[#6f624e]">
                          {item.baseCount} → {item.targetCount} ({formatDelta(item.delta)})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b5a45]">
                    {t("aiVocabulary.detail.topCandidatesTitle")}
                  </div>
                  <div className="mt-3 space-y-3">
                    {compareResult.topTermChanges.map((item) => (
                      <div key={`${item.term}-${item.changeType}`} className="rounded-[16px] bg-[#f7f2e8] p-4 text-sm">
                        <div className="font-semibold">{item.term}</div>
                        <div className="mt-1 text-[#6f624e]">
                          {item.baseCount} → {item.targetCount} · {item.changeType}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-[24px] bg-white p-6 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-serif text-2xl font-bold">{t("aiVocabulary.detail.filtersTitle")}</div>
                <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.filtersSubtitle")}</div>
              </div>
              <div className="text-sm text-[#6b5a45]">
                {t("aiVocabulary.detail.filteredCount", {
                  filtered: formatCount(terms.length),
                  total: formatCount(termsTotal),
                })}
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-6">
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.validation")}</div>
                <select className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none" value={validationFilter} onChange={(e) => setValidationFilter(e.target.value)}>
                  <option value="ALL">{t("aiVocabulary.detail.filter.all")}</option>
                  <option value="VALID">VALID</option>
                  {invalidBreakdown.map((item) => (
                    <option key={item.type} value={item.type}>{item.type}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.confidence")}</div>
                <select className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none" value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value)}>
                  <option value="ANY">{t("aiVocabulary.detail.filter.any")}</option>
                  <option value="0.9">&gt;= 0.90</option>
                  <option value="0.8">&gt;= 0.80</option>
                  <option value="0.7">&gt;= 0.70</option>
                  <option value="0.5">&gt;= 0.50</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.candidate")}</div>
                <select className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none" value={candidateFilter} onChange={(e) => setCandidateFilter(e.target.value)}>
                  <option value="ALL">{t("aiVocabulary.detail.filter.all")}</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.docId")}</div>
                <input
                  className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none"
                  placeholder={t("aiVocabulary.detail.filter.docIdPlaceholder")}
                  value={docIdFilter}
                  onChange={(e) => setDocIdFilter(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.searchTerm")}</div>
                <input
                  className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none"
                  placeholder={t("aiVocabulary.detail.filter.searchPlaceholder")}
                  value={termQuery}
                  onChange={(e) => setTermQuery(e.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#5f533f]">{t("aiVocabulary.detail.filter.sort")}</div>
                <select
                  className="h-11 w-full rounded-full bg-[#f7f2e8] px-4 outline-none"
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e) => {
                    const [nextSortBy, nextSortOrder] = e.target.value.split("_");
                    setSortBy(nextSortBy);
                    setSortOrder(nextSortOrder);
                  }}
                >
                  <option value="confidence_desc">{t("aiVocabulary.detail.sort.confidenceDesc")}</option>
                  <option value="confidence_asc">{t("aiVocabulary.detail.sort.confidenceAsc")}</option>
                  <option value="term_asc">{t("aiVocabulary.detail.sort.termAsc")}</option>
                  <option value="term_desc">{t("aiVocabulary.detail.sort.termDesc")}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-serif text-3xl font-bold">{t("aiVocabulary.detail.rawTerms")}</div>
                  <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.rawTermsConsoleSubtitle")}</div>
                </div>
                <div className="text-sm text-[#6b5a45]">{t("aiVocabulary.detail.listHint")}</div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[18px] border border-[#eee4d2]">
                <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_0.9fr] gap-4 bg-[#f7f2e8] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b5a45]">
                  <div>{t("aiVocabulary.detail.table.term")}</div>
                  <div>{t("aiVocabulary.detail.table.validation")}</div>
                  <div>{t("aiVocabulary.detail.table.confidence")}</div>
                  <div>{t("aiVocabulary.detail.table.docChunk")}</div>
                  <div>{t("aiVocabulary.detail.table.action")}</div>
                </div>

                <div className="max-h-[760px] overflow-auto">
                  {termsLoading && (
                    <div className="px-5 py-6 text-sm text-[#72604a]">{t("aiVocabulary.detail.loadingTerms")}</div>
                  )}
                  {!termsLoading &&
                    terms.map((term) => (
                      <div key={term.rowId} className={`grid grid-cols-[1.4fr_0.9fr_0.7fr_1fr_0.9fr] gap-4 border-t border-[#f0e8da] px-5 py-4 text-sm ${selectedTermId === term.rowId ? "bg-[#fcf7ee]" : "bg-white"}`}>
                        <button
                          type="button"
                          className="min-w-0 text-left font-semibold text-[#17322c] underline-offset-4 hover:underline"
                          onClick={() => setSelectedTermId(term.rowId)}
                        >
                          <div className="truncate">{term.displayTerm}</div>
                          <div className="mt-1 truncate text-xs font-normal text-[#7c6b54]">{term.displayEvidence}</div>
                        </button>
                        <div>
                          <button
                            type="button"
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(term.validationStatus)}`}
                            onClick={() => setValidationFilter(term.validationStatus)}
                          >
                            {term.validationStatus}
                          </button>
                        </div>
                        <div className="font-medium">{formatNumber(term.confidence)}</div>
                        <div className="text-[#6f624e]">
                          <div>{term.docId}</div>
                          <div className="text-xs">{term.chunkId}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="rounded-full border border-[#c9b89d] px-3 py-1 text-xs font-semibold text-[#4f4437]" onClick={() => setSelectedTermId(term.rowId)}>
                            {t("aiVocabulary.detail.view")}
                          </button>
                          <button type="button" disabled={termMutatingId === term.rawTermId} className="rounded-full bg-[#17322c] px-3 py-1 text-xs font-semibold text-[#f8f4ea] disabled:opacity-50" onClick={() => handleAddToCandidate(term)}>
                            {term.hasCandidate ? t("aiVocabulary.detail.viewCandidate") : t("aiVocabulary.detail.add")}
                          </button>
                        </div>
                      </div>
                    ))}
                  {!termsLoading && !terms.length && (
                    <div className="px-5 py-8 text-sm text-[#72604a]">{t("aiVocabulary.detail.rawTermsEmpty")}</div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-sm text-[#6f624e]">
                <button type="button" disabled={page <= 1} className="rounded-full border border-[#d8ccb8] px-4 py-2 disabled:opacity-50" onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  {t("aiVocabulary.review.paginationPrev")}
                </button>
                <span>{t("aiVocabulary.review.paginationPage", { current: page, total: pageCount })}</span>
                <button type="button" disabled={page >= pageCount} className="rounded-full border border-[#d8ccb8] px-4 py-2 disabled:opacity-50" onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
                  {t("aiVocabulary.review.paginationNext")}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-3xl font-bold">{t("aiVocabulary.detail.promptAndCandidate")}</div>
                <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.promptAndCandidateSubtitle")}</div>
                <div className="mt-6 rounded-[20px] bg-[#17322c] p-6 text-[#f8f4ea]">
                  <div className="text-sm font-semibold text-[#e7f0ec]">SYSTEM</div>
                  <div className="mt-3 max-h-36 overflow-auto text-sm leading-7 text-[#d7e5df]">
                    {prompt?.system_prompt ?? t("aiVocabulary.detail.promptUnavailable")}
                  </div>
                  <div className="mt-5 text-sm font-semibold text-[#e7f0ec]">USER</div>
                  <div className="mt-3 max-h-36 overflow-auto rounded-xl bg-black/10 p-3 font-mono text-xs text-[#f8f4ea]">
                    {prompt?.user_prompt_template ?? '[{"term":"术语","evidence":"原文证据","confidence":0.95}]'}
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[#6b5a45]">
                    {t("aiVocabulary.detail.promptPerformance")}
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <DetailField label={t("aiVocabulary.detail.avgTermsPerSample")} value={formatNumber(metrics && metrics.totalSamples > 0 ? metrics.rawTerms / metrics.totalSamples : 0, 1)} />
                    <DetailField label={t("aiVocabulary.detail.validRate")} value={formatPercent(metrics?.validRate)} />
                    <DetailField label={t("aiVocabulary.detail.noiseRate")} value={formatPercent(metrics?.noiseRate)} />
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-2xl font-bold">{t("aiVocabulary.detail.termDrawerTitle")}</div>
                {selectedTerm ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <div className="font-serif text-3xl font-bold">{selectedTerm.displayTerm}</div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#6f624e]">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(selectedTerm.validationStatus)}`}>{selectedTerm.validationStatus}</span>
                        <span>{t("aiVocabulary.detail.confidence", { value: formatNumber(selectedTerm.confidence) })}</span>
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-[#f7f2e8] p-4 text-sm leading-7 text-[#17322c]">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a674f]">{t("aiVocabulary.detail.evidenceLabel")}</div>
                      {highlightTerm(selectedTerm.displayEvidence, selectedTerm.displayTerm)}
                    </div>
                    <DetailField label={t("aiVocabulary.detail.contextPrev")} value={contextPrev} />
                    <div className="rounded-[16px] border border-[#d8c8a8] bg-[#fff9ed] p-4 text-sm leading-7 text-[#17322c]">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7a674f]">{t("aiVocabulary.detail.contextCurrent")}</div>
                      {highlightTerm(selectedTerm.displayEvidence, selectedTerm.displayTerm)}
                    </div>
                    <DetailField label={t("aiVocabulary.detail.contextNext")} value={contextNext} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <DetailField label="Doc" value={selectedTerm.docId} />
                      <DetailField label="Chunk" value={selectedTerm.chunkId} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={termMutatingId === selectedTerm.rawTermId} className="rounded-full bg-[#17322c] px-4 py-2 text-sm font-semibold text-[#f8f4ea] disabled:opacity-50" onClick={() => handleAddToCandidate(selectedTerm)}>
                        {selectedTerm.hasCandidate ? t("aiVocabulary.detail.viewCandidate") : t("aiVocabulary.detail.addToCandidate")}
                      </button>
                      <button type="button" disabled={termMutatingId === selectedTerm.rawTermId} className="rounded-full border border-[#caa990] px-4 py-2 text-sm font-semibold text-[#8d4a31] disabled:opacity-50" onClick={() => handleIgnoreTerm(selectedTerm)}>
                        {selectedTerm.validationStatus.toUpperCase() === "IGNORED"
                          ? t("aiVocabulary.detail.unignore")
                          : t("aiVocabulary.detail.ignore")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[16px] bg-[#fbf8f2] px-4 py-6 text-sm text-[#72604a]">{t("aiVocabulary.detail.selectTermHint")}</div>
                )}
              </div>

              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-2xl font-bold">{t("aiVocabulary.runs.logTitle")}</div>
                <div className="mt-2 text-sm text-[#72604a]">{t("aiVocabulary.detail.logSubtitle")}</div>
                <div className="mt-5 space-y-3">
                  {logs.map((entry) => (
                    <div key={entry.id} className="rounded-[16px] bg-[#fbf8f2] p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-[#6f614c]">
                        <span>{formatDate(entry.at)}</span>
                        {entry.level ? <span className="rounded-full bg-[#e8e1d2] px-3 py-1 font-semibold uppercase text-[#5f533f]">{entry.level}</span> : null}
                      </div>
                      <div className="mt-3 text-sm text-[#17322c]">{entry.message}</div>
                    </div>
                  ))}
                  {!logs.length && <div className="rounded-[16px] bg-[#fbf8f2] px-4 py-3 text-sm text-[#72604a]">{t("aiVocabulary.detail.logsEmpty")}</div>}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
