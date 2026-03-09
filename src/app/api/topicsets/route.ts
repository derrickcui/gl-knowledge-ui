import { ADMIN_TOPICSETS_SERVICE_BASE as TOPICSETS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

async function proxyTopicSets(request: Request, method: "GET" | "POST") {
  return proxyJsonRoute({
    url: `${TOPICSETS_API_BASE}/api/topicsets`,
    method,
    request,
    errorBody: { success: false, data: null, error: "topicset-service unreachable" },
    requestHeaderNames: ["if-match", "if-none-match"],
    responseHeaderNames: ["etag", "cache-control", "last-modified"],
  });
}

export async function GET(request: Request) {
  return proxyTopicSets(request, "GET");
}

export async function POST(request: Request) {
  return proxyTopicSets(request, "POST");
}
