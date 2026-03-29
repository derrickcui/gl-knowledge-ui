"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLocale, t } from "@/i18n";
import {
  getCandidate,
  listCandidateEvidence,
  listCandidates,
  reviewCandidate,
  TermCandidateEvidenceResponse,
  TermCandidateResponse,
} from "@/lib/ai-vocabulary-api";

type DocViewChunk = {
  id?: string | null;
  chunkIndex?: number | null;
  content?: string | null;
  anchorId?: string | null;
};

type DocViewResponse = {
  header?: {
    title?: string | null;
    sourcePath?: string | null;
    updatedAt?: string | null;
    docId?: string | null;
  } | null;
  content?: {
    cleanContent?: string | null;
    rawContent?: string | null;
    chunkMap?: Record<string, DocViewChunk> | null;
  } | null;
  rag?: {
    hitChunks?: Array<{
      chunkId?: string | null;
      snippet?: string | null;
    }> | null;
  } | null;
} | null;

function statusClass(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "CANDIDATE") return "bg-[#f8e8b3] text-[#856e15]";
  if (normalized === "APPROVED" || normalized === "PUBLISHED") {
    return "bg-[#e1f0d2] text-[#4f7134]";
  }
  if (normalized === "REJECTED") return "bg-[#f2d0c2] text-[#8d4a31]";
  return "bg-[#e8e1d2] text-[#5f533f]";
}

function statusLabel(status: string) {
  const normalized = status.toUpperCase();
  if (normalized === "CANDIDATE") return t("glossary.status.candidate");
  if (normalized === "APPROVED") return t("glossary.status.approved");
  if (normalized === "PUBLISHED") return t("glossary.status.published");
  if (normalized === "REJECTED") return t("glossary.status.rejected");
  return status;
}

function formatDate(value?: string | null) {
  if (!value) return t("aiVocabulary.review.empty");
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function usefulnessLabel(candidate: TermCandidateResponse | null) {
  if (!candidate) return t("aiVocabulary.review.usefulness.title");
  if (candidate.document_count >= 2 || candidate.evidence_count >= 3) {
    return t("aiVocabulary.review.usefulness.ruleConstruction");
  }
  if (candidate.term.length <= 2 || candidate.document_count === 1) {
    return t("aiVocabulary.review.usefulness.reusability");
  }
  return t("aiVocabulary.review.usefulness.generic");
}

function buildDocViewChunk(
  docView: DocViewResponse,
  chunkId: string | null | undefined
) {
  if (!docView) return null;
  const chunkMap = docView.content?.chunkMap ?? {};
  if (chunkId && chunkMap[chunkId]) {
    return chunkMap[chunkId];
  }
  const fallbackHit = docView.rag?.hitChunks?.[0];
  if (!fallbackHit) return null;
  const fallbackChunkId = fallbackHit.chunkId ?? "";
  return (
    (fallbackChunkId && chunkMap[fallbackChunkId]) || {
      id: fallbackChunkId,
      content: fallbackHit.snippet ?? "",
      chunkIndex: null,
      anchorId: null,
    }
  );
}

function AiCandidateReviewContent() {
  const pageSize = 20;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDataset = searchParams.get("dataset") ?? "gl_demo";
  const initialRun = searchParams.get("run") ?? "";
  const initialCandidateId = Number(searchParams.get("candidate") ?? "");
  const [dataset, setDataset] = useState(initialDataset);
  const [status, setStatus] = useState(searchParams.get("status") ?? "CANDIDATE");
  const [runId, setRunId] = useState(initialRun);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<TermCandidateResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(
    Number.isFinite(initialCandidateId) ? initialCandidateId : null
  );
  const [candidateDetail, setCandidateDetail] = useState<TermCandidateResponse | null>(null);
  const [evidence, setEvidence] = useState<TermCandidateEvidenceResponse[]>([]);
  const [docViewOpen, setDocViewOpen] = useState(false);
  const [docViewLoading, setDocViewLoading] = useState(false);
  const [docViewError, setDocViewError] = useState<string | null>(null);
  const [docViewEvidence, setDocViewEvidence] =
    useState<TermCandidateEvidenceResponse | null>(null);
  const [docView, setDocView] = useState<DocViewResponse>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    const result = await listCandidates({
      dataset,
      ai_run_id: runId || undefined,
      status: status === "ALL" ? undefined : status,
    });
    if (result.error) {
      setError(result.error);
      setCandidates([]);
      setLoading(false);
      return;
    }
    const nextCandidates = result.data ?? [];
    setCandidates(nextCandidates);
    if (
      nextCandidates.length &&
      !nextCandidates.some((item) => item.id === selectedCandidateId)
    ) {
      setSelectedCandidateId(nextCandidates[0].id);
    }
    if (!nextCandidates.length) {
      setSelectedCandidateId(null);
      setCandidateDetail(null);
      setEvidence([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [dataset, status, runId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dataset, status, runId, query]);

  useEffect(() => {
    if (!selectedCandidateId) return;
    let ignore = false;
    const candidateId = selectedCandidateId;

    async function loadDetail() {
      const [candidateResult, evidenceResult] = await Promise.all([
        getCandidate(candidateId),
        listCandidateEvidence(candidateId),
      ]);
      if (ignore) return;
      setCandidateDetail(candidateResult.data ?? null);
      setEvidence(evidenceResult.data ?? []);
      if (candidateResult.error || evidenceResult.error) {
        setError(candidateResult.error ?? evidenceResult.error ?? null);
      }
    }

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [selectedCandidateId]);

  const filteredCandidates = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return candidates;
    return candidates.filter((item) => {
      const haystack = [
        item.term,
        item.normalized_term,
        item.evidence,
        item.ai_run_id,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [candidates, query]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedCandidates = filteredCandidates.slice(pageStart, pageStart + pageSize);

  const selectedCandidate =
    candidateDetail ??
    filteredCandidates.find((item) => item.id === selectedCandidateId) ??
    null;

  const allSelected =
    pagedCandidates.length > 0 &&
    pagedCandidates.every((item) => selectedIds.includes(item.id));

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds((current) => {
        const next = new Set(current);
        pagedCandidates.forEach((item) => next.add(item.id));
        return Array.from(next);
      });
      return;
    }
    setSelectedIds((current) =>
      current.filter((id) => !pagedCandidates.some((item) => item.id === id))
    );
  }

  function toggleSelectOne(candidateId: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(candidateId) ? current : [...current, candidateId];
      }
      return current.filter((id) => id !== candidateId);
    });
  }

  async function submitReview(
    ids: number[],
    reviewStatus: "APPROVED" | "REJECTED" | "CANDIDATE"
  ) {
    if (!ids.length) return;
    setMutating(true);
    setError(null);
    setInfo(null);

    const results = await Promise.all(ids.map((id) => reviewCandidate(id, reviewStatus)));
    const failed = results.find((item) => item.error);

    if (failed?.error) {
      setError(failed.error);
      setMutating(false);
      return;
    }

    setInfo(
      reviewStatus === "APPROVED"
        ? t("aiVocabulary.review.feedback.published", { count: ids.length })
        : reviewStatus === "REJECTED"
          ? t("aiVocabulary.review.feedback.rejected", { count: ids.length })
          : t("aiVocabulary.review.feedback.reset", { count: ids.length })
    );
    setSelectedIds([]);
    setMutating(false);
    await refresh();
  }

  async function openEvidenceDocView(item: TermCandidateEvidenceResponse) {
    if (!item.chunk_id) return;
    setDocViewOpen(true);
    setDocViewEvidence(item);
    setDocView(null);
    setDocViewError(null);
    setDocViewLoading(true);
    try {
      const response = await fetch(`/api/docview/${encodeURIComponent(item.chunk_id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ includeOutline: false }),
        cache: "no-store",
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        setDocViewError(message || t("aiVocabulary.review.docViewLoadFailed"));
        setDocViewLoading(false);
        return;
      }
      const payload = (await response.json()) as DocViewResponse;
      setDocView(payload);
    } catch {
      setDocViewError(t("aiVocabulary.review.docViewLoadFailed"));
    } finally {
      setDocViewLoading(false);
    }
  }

  const matchedChunk = buildDocViewChunk(docView, docViewEvidence?.chunk_id);

  return (
    <div className="min-h-full overflow-auto bg-[#f2efe8] p-6 text-[#17322c]">
      <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fcfaf5] shadow-[0_24px_80px_rgba(23,50,44,0.08)]">
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
                {t("aiVocabulary.review.title")}
              </div>
            </div>
            <div className="text-sm text-[#d8e6df]">
              {t("aiVocabulary.review.source", { value: "ai_extract" })}
            </div>
          </div>
        </div>

        <div className="space-y-8 p-8">
          {(error || info) && (
            <div
              className={`rounded-[20px] border px-5 py-4 text-sm ${
                error
                  ? "border-[#f2d0c2] bg-[#fbf2ef] text-[#8d4a31]"
                  : "border-[#dde8c2] bg-[#eef5dc] text-[#476021]"
              }`}
            >
              {error ?? info}
            </div>
          )}

          <div className="rounded-[22px] bg-[#e8e1d2] p-6">
            <div className="grid gap-4 lg:grid-cols-[220px_200px_1fr_1fr_auto_auto]">
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#4e4334]">
                  {t("aiVocabulary.form.dataset")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none"
                  value={dataset}
                  onChange={(event) => setDataset(event.target.value)}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#4e4334]">
                  {t("glossary.candidates.columns.status")}
                </div>
                <select
                  className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="CANDIDATE">{t("glossary.status.candidate")}</option>
                  <option value="APPROVED">{t("glossary.status.approved")}</option>
                  <option value="REJECTED">{t("glossary.status.rejected")}</option>
                  <option value="ALL">{t("aiVocabulary.review.filter.allStatuses")}</option>
                </select>
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#4e4334]">
                  {t("aiVocabulary.review.filter.run")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none"
                  value={runId}
                  onChange={(event) => setRunId(event.target.value)}
                  placeholder={t("aiVocabulary.review.filter.runPlaceholder")}
                />
              </label>
              <label className="text-sm">
                <div className="mb-2 font-semibold text-[#4e4334]">
                  {t("glossary.audit.filters.search")}
                </div>
                <input
                  className="h-11 w-full rounded-full bg-[#fcfaf5] px-4 outline-none"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("aiVocabulary.review.filter.searchPlaceholder")}
                />
              </label>
              <button
                type="button"
                className="self-end rounded-full bg-[#17322c] px-5 py-2.5 text-sm font-semibold text-[#f8f4ea]"
                onClick={() => refresh()}
              >
                {t("common.confirm")}
              </button>
              <button
                type="button"
                className="self-end rounded-full bg-[#c9b89d] px-5 py-2.5 text-sm font-semibold text-[#4f4437]"
                onClick={() => {
                  setDataset("gl_demo");
                  setStatus("CANDIDATE");
                  setRunId("");
                  setQuery("");
                }}
              >
                {t("glossary.common.clear")}
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-serif text-3xl font-bold">
                    {t("aiVocabulary.review.listTitle")}
                  </div>
                  <div className="mt-2 text-sm text-[#72604a]">
                    {t("aiVocabulary.review.listSubtitle")}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#dde8c2] px-4 py-2 text-xs font-semibold text-[#476021] disabled:opacity-50"
                    disabled={mutating || !selectedIds.length}
                    onClick={() => submitReview(selectedIds, "APPROVED")}
                  >
                    {t("aiVocabulary.review.publishSelected")}
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#f2d0c2] px-4 py-2 text-xs font-semibold text-[#8d4a31] disabled:opacity-50"
                    disabled={mutating || !selectedIds.length}
                    onClick={() => submitReview(selectedIds, "REJECTED")}
                  >
                    {t("aiVocabulary.review.rejectSelected")}
                  </button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[20px] border border-[#e7decf]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbf8f2] text-[#6c5944]">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(event) => toggleSelectAll(event.target.checked)}
                          aria-label={t("aiVocabulary.review.selectAll")}
                        />
                      </th>
                      <th className="px-4 py-3">{t("aiVocabulary.review.term")}</th>
                      <th className="px-4 py-3">
                        {t("glossary.candidates.columns.confidence")}
                      </th>
                      <th className="px-4 py-3">{t("aiVocabulary.review.evidenceCount")}</th>
                      <th className="px-4 py-3">{t("aiVocabulary.review.docs")}</th>
                      <th className="px-4 py-3">
                        {t("glossary.candidates.columns.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedCandidates.map((candidate) => {
                      const active = candidate.id === selectedCandidateId;
                      return (
                        <tr
                          key={candidate.id}
                          className={active ? "bg-[#f7f2e8]" : "bg-white"}
                        >
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(candidate.id)}
                              onChange={(event) =>
                                toggleSelectOne(candidate.id, event.target.checked)
                              }
                              aria-label={t("glossary.common.selectRow", {
                                name: candidate.term,
                              })}
                            />
                          </td>
                          <td className="px-4 py-4 align-top">
                            <button
                              type="button"
                              className="text-left font-semibold hover:underline"
                              onClick={() => setSelectedCandidateId(candidate.id)}
                            >
                              {candidate.term}
                            </button>
                            <div className="mt-2 text-xs text-[#74614c]">
                              {(candidate.ai_run_id ?? t("aiVocabulary.review.noRun")) +
                                " · " +
                                formatDate(candidate.updated_at)}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {candidate.confidence.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 align-top">{candidate.evidence_count}</td>
                          <td className="px-4 py-4 align-top">{candidate.document_count}</td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(candidate.status)}`}
                            >
                              {statusLabel(candidate.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {!pagedCandidates.length && (
                      <tr>
                        <td className="px-4 py-8 text-center text-[#72604a]" colSpan={6}>
                          {loading
                            ? t("common.loading")
                            : t("aiVocabulary.review.emptyFiltered")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredCandidates.length ? (
                <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#72604a]">
                  <div>
                    {t("aiVocabulary.review.paginationSummary", {
                      start: pageStart + 1,
                      end: Math.min(pageStart + pageSize, filteredCandidates.length),
                      total: filteredCandidates.length,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[#d8cebe] px-4 py-2 font-semibold text-[#4f4437] disabled:opacity-40"
                      disabled={safeCurrentPage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      {t("aiVocabulary.review.paginationPrev")}
                    </button>
                    <div className="rounded-full bg-[#f7f2e8] px-4 py-2 font-semibold text-[#5f533f]">
                      {t("aiVocabulary.review.paginationPage", {
                        current: safeCurrentPage,
                        total: totalPages,
                      })}
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-[#d8cebe] px-4 py-2 font-semibold text-[#4f4437] disabled:opacity-40"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                    >
                      {t("aiVocabulary.review.paginationNext")}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] bg-white p-8 shadow-[0_12px_40px_rgba(23,50,44,0.06)]">
              <div className="font-serif text-3xl font-bold">
                {t("aiVocabulary.review.detailTitle")}
              </div>
              <div className="mt-2 text-sm text-[#72604a]">
                {t("aiVocabulary.review.detailSubtitle")}
              </div>

              {selectedCandidate ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-[20px] bg-[#17322c] p-7 text-[#f8f4ea]">
                    <div className="text-sm font-semibold text-[#d7e5df]">
                      {t("aiVocabulary.review.selectedTerm")}
                    </div>
                    <div className="mt-4 font-serif text-4xl font-bold">
                      {selectedCandidate.term}
                    </div>
                    <div className="mt-3 text-sm text-[#d7e5df]">
                      {t("aiVocabulary.review.selectedMeta", {
                        source: selectedCandidate.source ?? t("aiVocabulary.review.empty"),
                        status: statusLabel(selectedCandidate.status),
                        confidence: selectedCandidate.confidence.toFixed(2),
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[20px] bg-[#f7f2e8] p-6 text-sm">
                      <div className="font-semibold text-[#6c5944]">
                        {t("aiVocabulary.review.traceability")}
                      </div>
                      <div className="mt-4 space-y-2">
                        <div>
                          {t("aiVocabulary.review.trace.run", {
                            value: selectedCandidate.ai_run_id ?? t("aiVocabulary.review.empty"),
                          })}
                        </div>
                        <div>
                          {t("aiVocabulary.review.trace.sample", {
                            value:
                              selectedCandidate.sample_version_id ??
                              t("aiVocabulary.review.empty"),
                          })}
                        </div>
                        <div>
                          {t("aiVocabulary.review.trace.created", {
                            value: formatDate(selectedCandidate.created_at),
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[20px] bg-[#f7f2e8] p-6 text-sm">
                      <div className="font-semibold text-[#6c5944]">
                        {t("aiVocabulary.review.action")}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full bg-[#f8e8b3] px-4 py-2 font-semibold text-[#856e15]"
                          disabled={mutating}
                          onClick={() => submitReview([selectedCandidate.id], "CANDIDATE")}
                        >
                          {t("aiVocabulary.review.reset")}
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-[#f2d0c2] px-4 py-2 font-semibold text-[#8d4a31]"
                          disabled={mutating}
                          onClick={() => submitReview([selectedCandidate.id], "REJECTED")}
                        >
                          {t("glossary.common.reject")}
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-[#dde8c2] px-4 py-2 font-semibold text-[#476021]"
                          disabled={mutating}
                          onClick={() => submitReview([selectedCandidate.id], "APPROVED")}
                        >
                          {t("glossary.common.publish")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#e8e1d2] p-5 text-sm text-[#5f533f]">
                    <div className="font-semibold">{usefulnessLabel(selectedCandidate)}</div>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <span className="rounded-full bg-white px-3 py-1">
                        {t("aiVocabulary.review.usefulness.ruleConstruction")}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {t("aiVocabulary.review.usefulness.generic")}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {t("aiVocabulary.review.usefulness.notReusable")}
                      </span>
                    </div>
                    <div className="mt-3">
                      {t("aiVocabulary.review.usefulness.guideline")}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {selectedCandidate.ai_run_id && (
                      <button
                        type="button"
                        className="rounded-full border border-[#c9b89d] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                        onClick={() =>
                          router.push(
                            `/knowledge/operations/ai-vocabulary/runs/${encodeURIComponent(
                              selectedCandidate.ai_run_id as string
                            )}`
                          )
                        }
                      >
                        {t("aiVocabulary.review.openSourceRun")}
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="font-serif text-2xl font-bold">
                      {t("aiVocabulary.review.evidenceTitle")}
                    </div>
                    <div className="mt-4 space-y-4">
                      {evidence.map((item, index) => (
                        <div
                          key={`${item.raw_term_id ?? "ev"}-${index}`}
                          className="rounded-[20px] bg-[#fbf8f2] p-6"
                        >
                          <div className="text-sm font-semibold text-[#6f624e]">
                            {t("aiVocabulary.review.evidenceItem", {
                              index: index + 1,
                            })}
                          </div>
                          <div className="mt-3 text-base leading-8 text-[#17322c]">
                            {highlightTerm(item.evidence, selectedCandidate.term)}
                          </div>
                          <div className="mt-3 text-sm text-[#6f624e]">
                            <button
                              type="button"
                              className="text-left underline decoration-[#c9b89d] underline-offset-4 hover:text-[#17322c]"
                              disabled={!item.chunk_id}
                              onClick={() => void openEvidenceDocView(item)}
                            >
                              {t("aiVocabulary.review.evidenceMeta", {
                                doc: item.doc_id ?? t("aiVocabulary.review.empty"),
                                chunk: item.chunk_id ?? t("aiVocabulary.review.empty"),
                                rawTermId:
                                  item.raw_term_id ?? t("aiVocabulary.review.empty"),
                              })}
                            </button>
                          </div>
                        </div>
                      ))}
                      {!evidence.length && (
                        <div className="rounded-[20px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                          {t("aiVocabulary.review.evidenceEmpty")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[20px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                  {t("aiVocabulary.review.selectPrompt")}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      {docViewOpen ? (
        <>
          <button
            type="button"
            aria-label={t("aiVocabulary.review.docViewClose")}
            className="fixed inset-0 z-40 bg-[#17322c]/55"
            onClick={() => setDocViewOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[720px] overflow-auto bg-[#fcfaf5] p-6 shadow-[0_24px_80px_rgba(23,50,44,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#6f624e]">
                  {t("aiVocabulary.review.docViewTitle")}
                </div>
                <div className="mt-2 font-serif text-2xl font-bold text-[#17322c]">
                  {docView?.header?.title?.trim() ||
                    docViewEvidence?.doc_id ||
                    t("aiVocabulary.review.empty")}
                </div>
                <div className="mt-2 text-sm text-[#6f624e]">
                  {docViewEvidence?.chunk_id ?? t("aiVocabulary.review.empty")}
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-[#d8cebe] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                onClick={() => setDocViewOpen(false)}
              >
                {t("aiVocabulary.review.docViewClose")}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[20px] bg-[#f7f2e8] p-5 text-sm text-[#5f533f]">
                <div>
                  {t("aiVocabulary.review.docViewDoc", {
                    value: docViewEvidence?.doc_id ?? t("aiVocabulary.review.empty"),
                  })}
                </div>
                <div className="mt-2">
                  {t("aiVocabulary.review.docViewChunk", {
                    value: docViewEvidence?.chunk_id ?? t("aiVocabulary.review.empty"),
                  })}
                </div>
                <div className="mt-2 break-all">
                  {t("aiVocabulary.review.docViewSource", {
                    value: docView?.header?.sourcePath ?? t("aiVocabulary.review.empty"),
                  })}
                </div>
              </div>

              {docViewLoading ? (
                <div className="rounded-[20px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                  {t("aiVocabulary.review.loading")}
                </div>
              ) : null}

              {docViewError ? (
                <div className="rounded-[20px] border border-[#f2d0c2] bg-[#fbf2ef] p-6 text-sm text-[#8d4a31]">
                  {docViewError}
                </div>
              ) : null}

              {!docViewLoading && !docViewError ? (
                <div className="space-y-4">
                  <div className="rounded-[20px] bg-[#17322c] p-6 text-[#f8f4ea]">
                    <div className="text-sm font-semibold text-[#d7e5df]">
                      {t("aiVocabulary.review.docViewMatchedChunk")}
                    </div>
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-7">
                      {matchedChunk?.content
                        ? highlightTerm(
                            matchedChunk.content,
                            selectedCandidate?.term ?? docViewEvidence?.term ?? ""
                          )
                        : t("aiVocabulary.review.docViewChunkEmpty")}
                    </div>
                  </div>

                  {docViewEvidence?.evidence ? (
                    <div className="rounded-[20px] bg-[#fbf8f2] p-6">
                      <div className="text-sm font-semibold text-[#6f624e]">
                        {t("aiVocabulary.review.docViewEvidence")}
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#17322c]">
                        {highlightTerm(
                          docViewEvidence.evidence,
                          selectedCandidate?.term ?? docViewEvidence.term
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

export default function AiCandidateReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-full overflow-auto bg-[#f2efe8] p-6 text-[#17322c]">
          <div className="mx-auto max-w-[1500px] rounded-[28px] bg-[#fcfaf5] p-10">
            {t("aiVocabulary.review.loading")}
          </div>
        </div>
      }
    >
      <AiCandidateReviewContent />
    </Suspense>
  );
}
