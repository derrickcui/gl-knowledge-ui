import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET() {
  return proxyGetJson(`${TOPICS_API_BASE}/api/topics`, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    },
  );
}

export async function POST(request: Request) {
  return proxyMutationJson(`${TOPICS_API_BASE}/api/topics`, "POST", request, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    },
  );
}
