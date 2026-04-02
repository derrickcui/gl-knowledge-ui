import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${TOPICS_API_BASE}/api/topics/ai/suggest`, "POST", request, {
    success: false,
    data: null,
    error: "topic-service unreachable",
  });
}
