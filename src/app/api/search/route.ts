import { SEARCH_SERVICE_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

function normalizePage(value: unknown) {
  const page = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(page)) return undefined;
  return Math.max(1, Math.trunc(page));
}

function buildSearchBodyFromQuery(request: Request) {
  const url = new URL(request.url);
  const body: Record<string, unknown> = {
    query: url.searchParams.get("q") ?? "",
    mode: url.searchParams.get("mode") ?? "LEXICAL",
  };
  const page = url.searchParams.get("page");
  const size = url.searchParams.get("size");
  const fq = url.searchParams.getAll("fq");
  const normalizedPage = normalizePage(page);
  if (normalizedPage != null) body.page = normalizedPage;
  if (size != null && size !== "") body.size = Number(size);
  if (fq.length > 0) body.fq = fq;
  return JSON.stringify(body);
}

async function buildNormalizedPostRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return request;
  }

  const text = await request.text();
  if (!text) {
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: text,
    });
  }

  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const normalizedPage = normalizePage(body.page);
    if (normalizedPage != null) {
      body.page = normalizedPage;
    }
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(body),
    });
  } catch {
    return new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: text,
    });
  }
}

export async function GET(request: Request) {
  return proxyJsonRoute({
    url: `${SEARCH_SERVICE_BASE}/api/search`,
    method: "POST",
    request: new Request(request.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: buildSearchBodyFromQuery(request),
    }),
    errorBody: { success: false, data: null, error: "search-service unreachable" },
  });
}

export async function POST(request: Request) {
  const normalizedRequest = await buildNormalizedPostRequest(request);
  return proxyJsonRoute({
    url: `${SEARCH_SERVICE_BASE}/api/search`,
    method: "POST",
    request: normalizedRequest,
    errorBody: { success: false, data: null, error: "search-service unreachable" },
  });
}
