"use client";

import { useState } from "react";
import { CandidateDTO } from "@/lib/api";
import { t } from "@/i18n";
import { decodeUnicodeEscapes } from "@/lib/text-utils";

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
  } | null;
  content?: {
    chunkMap?: Record<string, DocViewChunk> | null;
  } | null;
  rag?: {
    hitChunks?: Array<{
      chunkId?: string | null;
      snippet?: string | null;
    }> | null;
  } | null;
} | null;

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

function highlightTerm(text: string, term: string) {
  if (!term || !text.includes(term)) return text;
  const parts = text.split(term);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${term}-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <mark className="rounded bg-[#f8e8b3] px-1 text-[#17322c]">
              {term}
            </mark>
          ) : null}
        </span>
      ))}
    </>
  );
}

export function CandidateEvidencePanel({
  candidate,
}: {
  candidate: CandidateDTO;
}) {
  const [docViewOpen, setDocViewOpen] = useState(false);
  const [docViewLoading, setDocViewLoading] = useState(false);
  const [docViewError, setDocViewError] = useState<string | null>(null);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(
    null
  );
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [docView, setDocView] = useState<DocViewResponse>(null);

  async function openEvidenceDocView(
    chunkId: string,
    quote: string
  ) {
    setDocViewOpen(true);
    setSelectedChunkId(chunkId);
    setSelectedQuote(quote);
    setDocView(null);
    setDocViewError(null);
    setDocViewLoading(true);
    try {
      const response = await fetch(
        `/api/docview/${encodeURIComponent(chunkId)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ includeOutline: false }),
          cache: "no-store",
        }
      );
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        setDocViewError(
          message ||
            t("glossary.candidates.evidence.docViewLoadFailed")
        );
        return;
      }
      const payload = (await response.json()) as DocViewResponse;
      setDocView(payload);
    } catch {
      setDocViewError(
        t("glossary.candidates.evidence.docViewLoadFailed")
      );
    } finally {
      setDocViewLoading(false);
    }
  }

  const matchedChunk = buildDocViewChunk(docView, selectedChunkId);
  const term = decodeUnicodeEscapes(candidate.canonical);
  const uniqueEvidence = (candidate.evidence ?? []).filter(
    (item, index, items) =>
      items.findIndex(
        (current) => current.chunk_id === item.chunk_id
      ) === index
  );

  return (
    <>
      <div className="space-y-3 rounded-md border p-4">
        <h2 className="font-medium">
          {t("glossary.candidates.evidence.title")}
        </h2>

        <div className="text-sm">
          <span className="opacity-60">
            {t("glossary.candidates.evidence.source")}
          </span>{" "}
          {candidate.source}
        </div>

        <div className="text-sm">
          <span className="opacity-60">
            {t("glossary.candidates.evidence.topics")}
          </span>{" "}
          {candidate.topics.length
            ? candidate.topics.join(", ")
            : t("glossary.common.none")}
        </div>

        <div className="rounded-md bg-muted p-3 text-xs leading-relaxed">
          <div className="mb-1 font-medium">
            {t("glossary.candidates.evidence.listTitle")}
          </div>
          {uniqueEvidence.length ? (
            <ul className="list-disc space-y-2 pl-4">
              {uniqueEvidence.map((item, index) => (
                <li key={`${item.chunk_id}-${index}`}>
                  <div>{item.quote}</div>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline"
                    disabled={!item.chunk_id}
                    onClick={() =>
                      item.chunk_id
                        ? void openEvidenceDocView(
                            item.chunk_id,
                            item.quote
                          )
                        : undefined
                    }
                  >
                    {t("glossary.candidates.evidence.chunk", {
                      id: item.chunk_id,
                    })}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="opacity-70">
              {t("glossary.candidates.evidence.empty")}
            </div>
          )}
        </div>
      </div>

      {docViewOpen ? (
        <>
          <button
            type="button"
            aria-label={t("glossary.candidates.evidence.docViewClose")}
            className="fixed inset-0 z-40 bg-[#17322c]/55"
            onClick={() => setDocViewOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[720px] overflow-auto bg-[#fcfaf5] p-6 shadow-[0_24px_80px_rgba(23,50,44,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[#6f624e]">
                  {t("glossary.candidates.evidence.docViewTitle")}
                </div>
                <div className="mt-2 font-serif text-2xl font-bold text-[#17322c]">
                  {docView?.header?.title?.trim() ||
                    t("glossary.common.none")}
                </div>
                <div className="mt-2 text-sm text-[#6f624e]">
                  {selectedChunkId ?? t("glossary.common.none")}
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-[#d8cebe] px-4 py-2 text-sm font-semibold text-[#4f4437]"
                onClick={() => setDocViewOpen(false)}
              >
                {t("glossary.candidates.evidence.docViewClose")}
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[20px] bg-[#f7f2e8] p-5 text-sm text-[#5f533f]">
                <div>
                  {t("glossary.candidates.evidence.docViewChunk", {
                    value: selectedChunkId ?? t("glossary.common.none"),
                  })}
                </div>
                <div className="mt-2 break-all">
                  {t("glossary.candidates.evidence.docViewSource", {
                    value:
                      docView?.header?.sourcePath ??
                      t("glossary.common.none"),
                  })}
                </div>
              </div>

              {docViewLoading ? (
                <div className="rounded-[20px] bg-[#fbf8f2] p-6 text-sm text-[#72604a]">
                  {t("common.loading")}
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
                      {t(
                        "glossary.candidates.evidence.docViewMatchedChunk"
                      )}
                    </div>
                    <div className="mt-4 whitespace-pre-wrap text-sm leading-7">
                      {matchedChunk?.content
                        ? highlightTerm(matchedChunk.content, term)
                        : t(
                            "glossary.candidates.evidence.docViewChunkEmpty"
                          )}
                    </div>
                  </div>

                  {selectedQuote ? (
                    <div className="rounded-[20px] bg-[#fbf8f2] p-6">
                      <div className="text-sm font-semibold text-[#6f624e]">
                        {t("glossary.candidates.evidence.docViewEvidence")}
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#17322c]">
                        {highlightTerm(selectedQuote, term)}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}
