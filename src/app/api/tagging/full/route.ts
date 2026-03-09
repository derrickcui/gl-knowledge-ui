import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${TAGGING_API_BASE}/api/tagging/full`, "POST", request, { success: false, data: null, error: "tagging-service unreachable" });
}
