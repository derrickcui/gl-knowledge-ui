import { ANALYTICS_SERVICE_BASE as ANALYTICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET() {
  return proxyGetJson(`${ANALYTICS_API_BASE}/api/analytics/overview`, { success: false, data: null, error: "analytics-service unreachable" },
  );
}
