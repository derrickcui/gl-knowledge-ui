export interface GlossaryNode {
  id: number;
  canonical: string;
  version?: number;
  type?: string;
  isCenter?: boolean;
}

export interface GlossaryEdge {
  id: number;
  source: number;
  target: number;
  predicate: string;
  version?: number;
  direction?: "INCOMING" | "OUTGOING";
}

export interface GlossaryGraphResult {
  center: { id: number; canonical: string; version?: number };
  nodes: GlossaryNode[];
  edges: GlossaryEdge[];
  meta?: {
    depth?: number;
    nodeCount?: number;
    edgeCount?: number;
    truncated?: boolean;
    expandable?: boolean;
  };
}

export interface GlossaryConceptDetail {
  id: number;
  canonical: string;
  aliases?: string[];
  definition?: string | null;
  source?: string | null;
  status?: string;
  evidence?: Array<Record<string, any>>;
  version?: number;
}

export interface GlossaryConceptRelationNode {
  id: number;
  name: string;
  status: string;
}

export interface GlossaryConceptRelationItem {
  predicate: string;
  relationStatus: string;
  source?: GlossaryConceptRelationNode | null;
  target?: GlossaryConceptRelationNode | null;
}

export interface GlossaryConceptRelationsResponse {
  incoming: GlossaryConceptRelationItem[];
  outgoing: GlossaryConceptRelationItem[];
}

export interface GlossaryConceptSearchPage {
  items: GlossaryGraphResult[];
  total: number | null;
  hasMore: boolean;
}

export async function searchGlossaryConceptsPaged(params: {
  query: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams({
    query: params.query,
    depth: "1",
    maxNodes: "20",
    includeIncoming: "true",
    includeOutgoing: "true",
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
  });
  const res = await fetch(`/api/concept?${search.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Unable to load glossary search results.");
  }

  const payload = (await res.json()) as unknown;
  if (Array.isArray(payload)) {
    return {
      items: payload as GlossaryGraphResult[],
      total: null,
      hasMore: (payload as GlossaryGraphResult[]).length >= (params.limit ?? 20),
    } as GlossaryConceptSearchPage;
  }

  if (payload && typeof payload === "object") {
    const data = payload as Record<string, any>;
    const items = Array.isArray(data.items)
      ? (data.items as GlossaryGraphResult[])
      : Array.isArray(data.data?.items)
      ? (data.data.items as GlossaryGraphResult[])
      : Array.isArray(data.data)
      ? (data.data as GlossaryGraphResult[])
      : [];
    const total =
      typeof data.total === "number"
        ? data.total
        : typeof data.data?.total === "number"
        ? data.data.total
        : null;
    const hasMore =
      typeof data.hasMore === "boolean"
        ? data.hasMore
        : typeof data.data?.hasMore === "boolean"
        ? data.data.hasMore
        : total != null
        ? (params.offset ?? 0) + items.length < total
        : items.length >= (params.limit ?? 20);
    return { items, total, hasMore } as GlossaryConceptSearchPage;
  }

  return { items: [], total: null, hasMore: false } as GlossaryConceptSearchPage;
}

export async function searchGlossaryConcepts(query: string) {
  const page = await searchGlossaryConceptsPaged({ query, limit: 20, offset: 0 });
  return page.items;
}

export async function fetchGlossaryConcept(id: number) {
  const res = await fetch(
    `/api/concept/${id}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Unable to load concept detail.");
  }
  return (await res.json()) as GlossaryConceptDetail;
}

export async function fetchGlossaryConceptRelations(id: number) {
  const res = await fetch(
    `/api/concept/${id}/relations`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Unable to load concept relations.");
  }
  return (await res.json()) as GlossaryConceptRelationsResponse;
}
