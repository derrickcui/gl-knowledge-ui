import { SEARCH_SERVICE_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ docId: string }> }
) {
  const { docId } = await context.params;
  return proxyGetJson(
    `${SEARCH_SERVICE_BASE}/api/docview/${encodeURIComponent(docId)}`,
    { success: false, data: null, error: "search-service unreachable" }
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ docId: string }> }
) {
  const { docId } = await context.params;
  return proxyMutationJson(
    `${SEARCH_SERVICE_BASE}/api/docview/${encodeURIComponent(docId)}`,
    "POST",
    request,
    { success: false, data: null, error: "search-service unreachable" }
  );
}
