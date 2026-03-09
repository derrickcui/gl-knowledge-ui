import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute, withRequestSearch } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJson(withRequestSearch(`${TAGGING_API_BASE}/api/tagging/jobs`, request), { success: false, data: null, error: "tagging-service unreachable" });
}
