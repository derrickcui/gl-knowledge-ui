import { ANALYTICS_RUNTIME_STATUS_SERVICE_BASE as ANALYTICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET() {
  return proxyGetJson(`${ANALYTICS_API_BASE}/api/analytics/runtime-status`, { success: false, data: null, error: "analytics-service unreachable" });
}
