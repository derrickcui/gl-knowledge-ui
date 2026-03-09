import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";
import { SEARCH_API_BASE } from "../../coverage/shared";

export async function POST(request: Request) {
  return proxyMutationJson(`${SEARCH_API_BASE}/api/governance/topic-signals/timeline`, "POST", request, { success: false, data: null, error: "governance-service unreachable" });
}
