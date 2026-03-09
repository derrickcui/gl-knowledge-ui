import { SEARCH_FACETS_SERVICE_BASE as SEARCH_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyGetJsonWithSearch, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${SEARCH_API_BASE}/api/search/facets`, request, { success: false, data: null, error: "search-service unreachable" },
  );
}
