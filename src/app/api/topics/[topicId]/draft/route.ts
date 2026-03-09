import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  return proxyGetJson(`${TOPICS_API_BASE}/api/topics/${topicId}/draft`, {
    success: false,
    data: null,
    error: "topic-service unreachable",
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  return proxyMutationJson(`${TOPICS_API_BASE}/api/topics/${topicId}/draft`, "PUT", request, {
      success: false,
      data: null,
      error: "topic-service unreachable",
    });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  return proxyMutationJson(
    `${TOPICS_API_BASE}/api/topics/${topicId}/draft`,
    "DELETE",
    undefined,
    {
      success: false,
      data: null,
      error: "topic-service unreachable",
    }
  );
}
