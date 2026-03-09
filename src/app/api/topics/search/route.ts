import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${TOPICS_API_BASE}/api/topics/search`);
  incomingUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  return proxyGetJson(upstreamUrl.toString(), {
      success: false,
      data: null,
      error: "topic-service unreachable",
    },
  );
}
