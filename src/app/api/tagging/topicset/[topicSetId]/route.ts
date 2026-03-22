import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyMutationJson } from "@/lib/api/serverProxy";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicSetId: string }> }
) {
  const { topicSetId } = await params;
  return proxyMutationJson(
    `${TAGGING_API_BASE}/api/tagging/topicset/${encodeURIComponent(topicSetId)}`,
    "POST",
    request,
    { success: false, data: null, error: "tagging-service unreachable" }
  );
}
