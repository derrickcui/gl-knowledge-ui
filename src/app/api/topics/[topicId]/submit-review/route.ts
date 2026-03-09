import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  return proxyMutationJson(`${TOPICS_API_BASE}/api/topics/${topicId}/submit-review`, "POST", request, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    });
}
