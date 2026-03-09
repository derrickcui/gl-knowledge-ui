import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string; revision: string }> }
) {
  const { topicId, revision } = await params;
  return proxyMutationJson(`${TOPICS_API_BASE}/api/topics/${topicId}/reviews/${revision}/decision`, "POST", request, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    });
}
