import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string; revision: string }> }
) {
  const { topicId, revision } = await params;
  return proxyGetJson(`${TOPICS_API_BASE}/api/topics/${topicId}/reviews/${revision}`, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    });
}
