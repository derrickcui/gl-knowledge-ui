"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getLocale, t } from "@/i18n";
import {
  getPromptVersion,
  getRun,
  listRunLogs,
  getRunSummary,
  getSampleVersion,
  listCandidates,
  listRunTerms,
  PromptVersionResponse,
  RawTermResponse,
  RunLogResponse,
  RunResponse,
  RunSummaryResponse,
  SampleVersionResponse,
  TermCandidateResponse,
} from "@/lib/ai-vocabulary-api";

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

function formatNumber(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(2);
}

function formatCount(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString(getLocale());
}

function decodeUnicodeEscapes(input?: string | null) {
  if (!input) return "";
  const decoded = input.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
  return decoded.replace(/\\(?![\\/\"'bfnrtu])/g, "");
}

function isSuspiciousRawTerm(value?: string | null) {
  if (!value) return true;
  const normalized = value.trim();
  if (!normalized) return true;
  if (/^[?？�\s._-]*\d+$/.test(normalized)) return true;
  if (/^[?？�]{2,}/.test(normalized)) return true;
  return false;
}

function extractTermFromRawModelOutput(rawModelOutput?: string | null) {
  if (!rawModelOutput) return null;

  const text = decodeUnicodeEscapes(rawModelOutput).trim();
  if (!text) return null;

  const tryReadTerm = (value: unknown): string | null => {
    if (!value) return null;
    if (Array.isArray(value)) {
      for (const item of value) {
        const next = tryReadTerm(item);
        if (next) return next;
      }
      return null;
    }
    if (typeof value === "object") {
      const record = value as Record<string, unknown>;
      const direct =
        typeof record.term === "string"
          ? decodeUnicodeEscapes(record.term).trim()
          : null;
      if (direct) return direct;
    }
    return null;
  };

  try {
    return tryReadTerm(JSON.parse(text));
  } catch {
    return null;
  }
}

function resolveRawTermLabel(term: RawTermResponse): string {
  const direct = decodeUnicodeEscapes(term.term).trim();
  if (!isSuspiciousRawTerm(direct)) return direct;

  const normalized = decodeUnicodeEscapes(term.normalized_term).trim();
  if (!isSuspiciousRawTerm(normalized)) return normalized;

  const extracted = extractTermFromRawModelOutput(term.raw_model_output)?.trim() ?? "";
  if (!isSuspiciousRawTerm(extracted)) return extracted;

  return direct || normalized || extracted || term.id;
}

function resolveEvidenceText(term: RawTermResponse): string {
  return decodeUnicodeEscapes(term.evidence).trim() || term.evidence;
}

type RunLogEntry = {
  id: string;
  at: string;
  message: string;
  level?: string | null;
};

function normalizeRunLogs(logs: RunLogResponse[]) {
  return logs.map((log, index) => ({
    id: String(log.id ?? `${log.created_at ?? "log"}:${index}:${log.message}`),
    at: log.created_at ?? new Date().toISOString(),
    message: log.message,
    level: log.level ?? null,
  }));
}

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("COMPLETE")) return "bg-[#dde8c2] text-[#476021]";
  if (normalized.includes("RUN") || normalized.includes("QUEUE")) {
    return "bg-[#f8e8b3] text-[#856e15]";
  }
  if (normalized.includes("FAIL")) return "bg-[#f2d0c2] text-[#8d4a31]";
  return "bg-[#e8e1d2] text-[#5f533f]";
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
      <div className="mt-3 font-serif text-3xl font-bold">{value}</div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "dark" | "warm" | "green" | "sand" | "rose";
}) {
  const toneClass =
    tone === "dark"
      ? "bg-[#17322c] text-[#f8f4ea]"
      : tone === "warm"
        ? "bg-[#a34e2e] text-[#fff6ee]"
        : tone === "green"
          ? "bg-[#7b8b49] text-[#f4f7ea]"
          : tone === "rose"
            ? "bg-[#e6d4c4] text-[#17322c]"
            : "bg-[#dccdb2] text-[#17322c]";
  return (
    <div className={`rounded-[22px] p-6 ${toneClass}`}>
      <div className="text-sm font-semibold opacity-85">{title}</div>
      <div className="mt-6 font-serif text-5xl font-bold">{formatCount(value)}</div>
    </div>
  );
}

function ExplainStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#f7f2e8] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6c5944]">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#17322c]">{value}</div>
    </div>
  );
}

export function RunDetailView({ runId }: { runId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunResponse | null>(null);
  const [summary, setSummary] = useState<RunSummaryResponse | null>(null);
  const [terms, setTerms] = useState<RawTermResponse[]>([]);
  const [candidates, setCandidates] = useState<TermCandidateResponse[]>([]);
  const [prompt, setPrompt] = useState<PromptVersionResponse | null>(null);
  const [sample, setSample] = useState<SampleVersionResponse | null>(null);
  const [logs, setLogs] = useState<RunLogEntry[]>([]);

  async function refresh() {
    setLoading(true);
    setError(null);

    const [runResult, summaryResult, termResult, candidateResult, logResult] = await Promise.all([
      getRun(runId),
      getRunSummary(runId),
      listRunTerms(runId),
      listCandidates({ ai_run_id: runId }),
      listRunLogs(runId, 5),
    ]);

    if (!runResult.data) {
      setError(
        runResult.error ??
          summaryResult.error ??
          termResult.error ??
          candidateResult.error ??
          t("aiVocabulary.detail.loadFailed")
      );
      setLoading(false);
      return;
    }

    setRun(runResult.data);
    setSummary(summaryResult.data ?? null);
    setTerms(termResult.data ?? []);
    setLogs(normalizeRunLogs(logResult.data ?? []));
    setCandidates(
      [...(candidateResult.data ?? [])].sort(
        (a, b) =>
          b.evidence_count - a.evidence_count || b.confidence - a.confidence
      )
    );

    const [promptResult, sampleResult] = await Promise.all([
      getPromptVersion(runResult.data.prompt_version),
      getSampleVersion(runResult.data.sample_version_id),
    ]);
    setPrompt(promptResult.data ?? null);
    setSample(sampleResult.data ?? null);
    if (summaryResult.error || termResult.error || candidateResult.error || logResult.error) {
      setError(summaryResult.error ?? termResult.error ?? candidateResult.error ?? logResult.error ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, [runId]);

  useEffect(() => {
    if (!run) return;
    const normalized = run.status.toUpperCase();
    if (!normalized.includes("RUN") && !normalized.includes("QUEUE")) return;

    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [runId, run?.status]);

  const invalidBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    terms
      .filter((item) => item.validation_status.toUpperCase() !== "VALID")
      .forEach((item) => {
        const key = item.validation_status || "UNKNOWN";
        map.set(key, (map.get(key) ?? 0) + 1);
      });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [terms]);

  const topCandidates = useMemo(() => candidates.slice(0, 5), [candidates]);

  if (!run && loading) {
    return (
      <div className="min-h-full overflow-auto bg-[#f1efe7] p-6">
        <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fbfaf6] p-10 text-[#17322c]">
          {t("aiVocabulary.detail.loading")}
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-full overflow-auto bg-[#f1efe7] p-6">
        <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fbfaf6] p-10 text-[#8d4a31]">
          {error ?? t("aiVocabulary.detail.unavailable")}
        </div>
      </div>
    );
  }

  const featuredCandidate = topCandidates[0] ?? null;
  const validTermCount =
    summary?.valid_term_count ??
    terms.filter((item) => item.validation_status.toUpperCase() === "VALID").length;
  const invalidTermCount =
    summary?.invalid_term_count ??
    invalidBreakdown.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="min-h-full overflow-auto bg-[#f1efe7] p-6 text-[#17322c]">
      <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fbfaf6] shadow-[0_24px_80px_rgba(23,50,44,0.08)]">
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
            <div className="text-sm text-[#d8e6df]">{run.run_key}</div>
          </div>
        </div>

        <div className="space-y-8 p-8">
          {error && (
            <div className="rounded-[20px] border border-[#f2d0c2] bg-[#fbf2ef] px-5 py-4 text-sm text-[#8d4a31]">
              {error}
            </div>
          )}

          <section className="rounded-[24px] bg-[#e8e1d2] p-7">
            <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <MetaBlock label={t("aiVocabulary.detail.dataset")} value={run.dataset} />
              <MetaBlock
                label={t("aiVocabulary.detail.sampleVersion")}
                value={sample?.version_name ?? run.sample_version_id}
              />
              <MetaBlock label={t("aiVocabulary.detail.promptVersion")} value={run.prompt_version} />
              <MetaBlock
                label={t("aiVocabulary.detail.model")}
                value={`${run.provider} / ${run.model_name}`}
              />
              <div className="flex items-start justify-end">
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ${statusClass(run.status)}`}>
                  {run.status}
                </span>
              </div>
            </div>
            <div className="mt-5 text-sm text-[#6f624e]">
              {t("aiVocabulary.detail.meta", {
                createdAt: formatDate(run.created_at),
                batchSize: run.batch_size ?? "—",
                temperature: run.temperature ?? "—",
                maxChunks: run.max_chunks_per_doc ?? "—",
              })}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-6">
            <MetricCard
              tone="dark"
              title={t("aiVocabulary.detail.totalSamples")}
              value={summary?.total_samples ?? run.total_samples}
            />
            <MetricCard
              tone="warm"
              title={t("aiVocabulary.detail.rawTerms")}
              value={summary?.raw_term_count ?? terms.length}
            />
            <MetricCard
              tone="green"
              title={t("aiVocabulary.detail.validTerms")}
              value={validTermCount}
            />
            <MetricCard
              tone="sand"
              title={t("aiVocabulary.detail.invalidTerms")}
              value={invalidTermCount}
            />
            <MetricCard
              tone="rose"
              title={t("aiVocabulary.detail.termCandidates")}
              value={summary?.candidate_count ?? candidates.length}
            />
            <div className="rounded-[22px] bg-[#e7e1d5] p-6">
              <div className="text-sm font-semibold text-[#655844]">
                {t("aiVocabulary.detail.actions")}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full bg-[#17322c] px-4 py-2 text-sm font-semibold text-[#f8f4ea]"
                  onClick={() => router.push("/knowledge/operations/ai-vocabulary")}
                >
                  {t("aiVocabulary.detail.rerun")}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-[#c9b89d] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                  onClick={() =>
                    router.push(
                      `/knowledge/glossary/ai-review?dataset=${encodeURIComponent(
                        run.dataset
                      )}&run=${encodeURIComponent(run.id)}`
                    )
                  }
                >
                  {t("aiVocabulary.detail.review")}
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <section className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="font-serif text-3xl font-bold">{t("aiVocabulary.detail.rawTerms")}</div>
              <div className="mt-2 text-sm text-[#72604a]">
                {t("aiVocabulary.detail.rawTermsSubtitle")}
              </div>

              <div className="mt-6 space-y-4">
                {terms.slice(0, 24).map((term) => {
                  const valid = term.validation_status.toUpperCase() === "VALID";
                  const displayTerm = resolveRawTermLabel(term);
                  const displayEvidence = resolveEvidenceText(term);
                  return (
                    <div
                      key={term.id}
                      className={`rounded-[18px] border p-5 ${
                        valid
                          ? "border-[#eee4d2] bg-[#f7f2e8]"
                          : "border-[#f2d0c2] bg-[#fbf2ef]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="min-w-[180px] text-lg font-semibold">{displayTerm}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(term.validation_status)}`}>
                          {term.validation_status}
                        </span>
                        <div className="text-sm">
                          {t("aiVocabulary.detail.confidence", {
                            value: formatNumber(term.confidence),
                          })}
                        </div>
                        <div className="text-sm text-[#6f624e]">
                          {term.doc_id} / {term.chunk_id}
                        </div>
                      </div>
                      <div className="mt-3 text-sm leading-7 text-[#74614c]">
                        {t("aiVocabulary.detail.evidence")} {highlightTerm(displayEvidence, displayTerm)}
                      </div>
                    </div>
                  );
                })}
                {!terms.length && (
                  <div className="rounded-[18px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                    {t("aiVocabulary.detail.rawTermsEmpty")}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-3xl font-bold">
                  {t("aiVocabulary.detail.promptAndCandidate")}
                </div>
                <div className="mt-2 text-sm text-[#72604a]">
                  {t("aiVocabulary.detail.promptAndCandidateSubtitle")}
                </div>

                <div className="mt-6 rounded-[20px] bg-[#17322c] p-6 text-[#f8f4ea]">
                  <div className="text-sm font-semibold text-[#e7f0ec]">
                    {t("aiVocabulary.detail.systemUserPrompt")}
                  </div>
                  <div className="mt-4 text-sm leading-7 text-[#d7e5df]">
                    {prompt?.system_prompt ?? t("aiVocabulary.detail.promptUnavailable")}
                  </div>
                  <div className="mt-4 rounded-xl bg-black/10 p-3 font-mono text-xs text-[#f8f4ea]">
                    {prompt?.user_prompt_template ??
                      '[{"term":"术语","evidence":"原文证据","confidence":0.95}]'}
                  </div>
                </div>

                <div className="mt-6 rounded-[20px] bg-[#f7f2e8] p-6">
                  <div className="text-sm font-semibold">
                    {t("aiVocabulary.detail.aggregatedIntoCandidate")}
                  </div>
                  {featuredCandidate ? (
                    <>
                      <div className="mt-4 font-serif text-3xl font-bold">{featuredCandidate.term}</div>
                      <div className="mt-3 text-sm text-[#6d5b46]">
                          {t("aiVocabulary.detail.featuredCandidateMeta", {
                          source: featuredCandidate.source,
                          status: featuredCandidate.status,
                          evidenceCount: formatCount(featuredCandidate.evidence_count),
                        })}
                      </div>
                      <div className="mt-2 text-sm text-[#6d5b46]">
                        {t("aiVocabulary.detail.featuredCandidateLink", {
                          run: featuredCandidate.ai_run_id ?? run.run_key,
                          sample: featuredCandidate.sample_version_id ?? run.sample_version_id,
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {topCandidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            className="rounded-full border border-[#c9b89d] px-3 py-1 text-xs font-semibold text-[#4f4437]"
                            onClick={() =>
                              router.push(
                                `/knowledge/glossary/ai-review?dataset=${encodeURIComponent(
                                  run.dataset
                                )}&run=${encodeURIComponent(run.id)}&candidate=${candidate.id}`
                              )
                            }
                          >
                            {candidate.term}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 text-sm text-[#6d5b46]">
                      {t("aiVocabulary.detail.candidatesEmpty")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-2xl font-bold">
                  {t("aiVocabulary.detail.invalidBreakdown")}
                </div>
                <div className="mt-2 text-sm text-[#72604a]">
                  {t("aiVocabulary.detail.invalidBreakdownSubtitle")}
                </div>
                <div className="mt-5 space-y-3">
                  {invalidBreakdown.map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-[16px] bg-[#fbf8f2] px-4 py-3 text-sm"
                    >
                      <span>{label}</span>
                      <span className="font-semibold">{formatCount(count)}</span>
                    </div>
                  ))}
                  {!invalidBreakdown.length && (
                    <div className="rounded-[16px] bg-[#eef5dc] px-4 py-3 text-sm text-[#476021]">
                      {t("aiVocabulary.detail.invalidBreakdownEmpty")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-2xl font-bold">{t("aiVocabulary.runs.logTitle")}</div>
                <div className="mt-2 text-sm text-[#72604a]">
                  {t("aiVocabulary.detail.logSubtitle")}
                </div>
                <div className="mt-5 space-y-3">
                  {logs.map((entry) => (
                    <div key={entry.id} className="rounded-[16px] bg-[#fbf8f2] p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-[#6f614c]">
                        <span>{formatDate(entry.at)}</span>
                        {entry.level ? (
                          <span className="rounded-full bg-[#e8e1d2] px-3 py-1 font-semibold uppercase text-[#5f533f]">
                            {entry.level}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 text-sm text-[#17322c]">{entry.message}</div>
                    </div>
                  ))}
                  {!logs.length && (
                    <div className="rounded-[16px] bg-[#fbf8f2] px-4 py-3 text-sm text-[#72604a]">
                      {t("aiVocabulary.detail.logsEmpty")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
                <div className="font-serif text-2xl font-bold">
                  {t("aiVocabulary.detail.sampleExplainability")}
                </div>
                <div className="mt-2 text-sm text-[#72604a]">
                  {t("aiVocabulary.detail.sampleExplainabilitySubtitle")}
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ExplainStat
                    label={t("aiVocabulary.detail.avgSimilarity")}
                    value={formatNumber(sample?.avg_similarity)}
                  />
                  <ExplainStat
                    label={t("aiVocabulary.detail.minSimilarity")}
                    value={formatNumber(sample?.min_similarity)}
                  />
                  <ExplainStat
                    label={t("aiVocabulary.detail.clusterEstimate")}
                    value={formatCount(sample?.cluster_count_estimate)}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
