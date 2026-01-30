const GLOSSARY_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

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
  status?: string;
  evidence?: Array<Record<string, any>>;
  version?: number;
}

export async function searchGlossaryConcepts(query: string) {
  const params = new URLSearchParams({
    query,
    depth: "1",
    maxNodes: "20",
    includeIncoming: "true",
    includeOutgoing: "true",
  });
  const res = await fetch(
    `${GLOSSARY_API_BASE}/v1/glossary/concepts?${params.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Unable to load glossary search results.");
  }
  return (await res.json()) as GlossaryGraphResult[];
}

export async function fetchGlossaryConcept(id: number) {
  const res = await fetch(
    `${GLOSSARY_API_BASE}/v1/glossary/concepts/${id}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    throw new Error("Unable to load concept detail.");
  }
  return (await res.json()) as GlossaryConceptDetail;
}
