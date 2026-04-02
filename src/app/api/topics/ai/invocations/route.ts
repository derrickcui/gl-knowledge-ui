import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJsonWithSearch } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${TOPICS_API_BASE}/api/topics/ai/invocations`, request, {
    success: false,
    data: null,
    error: "topic-service unreachable",
  });
}
