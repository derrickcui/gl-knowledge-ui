import { ANALYTICS_SERVICE_BASE as ANALYTICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyGetJsonWithSearch, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${ANALYTICS_API_BASE}/api/analytics/drift`, request, { success: false, data: null, error: "analytics-service unreachable" },
  );
}
