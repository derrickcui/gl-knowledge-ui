import type { ApiResult } from "@/lib/api";

type SearchHit = {
  id?: string | null;
  docId?: string | null;
  title?: string | null;
  summary?: string | null;
  snippet?: string | null;
  score?: number | null;
};

type SearchResponse = {
  totalHits?: number;
  total?: number;
  page?: number;
  size?: number;
  hits?: SearchHit[];
  items?: SearchHit[];
};

function buildErrorMessage(status: number, statusText: string) {
  return `search request failed (${status} ${statusText})`;
}

function normalizePage(page?: number) {
  if (page == null || Number.isNaN(page)) return undefined;
  return Math.max(1, Math.trunc(page));
}

export async function searchDocuments(params: {
  q: string;
  page?: number;
  size?: number;
  fq?: string[];
}) : Promise<ApiResult<SearchResponse>> {
  const query = new URLSearchParams();
  query.set("q", params.q);
  const page = normalizePage(params.page);
  if (page != null) query.set("page", String(page));
  if (params.size != null) query.set("size", String(params.size));
  for (const filter of params.fq ?? []) {
    query.append("fq", filter);
  }

  try {
    const res = await fetch(`/api/search?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      return { data: null, error: buildErrorMessage(res.status, res.statusText) };
    }
    return { data: (await res.json()) as SearchResponse, error: null };
  } catch {
    return { data: null, error: "search-service unreachable" };
  }
}

export type { SearchResponse, SearchHit };
