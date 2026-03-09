import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return proxyMutationJson(`${TAGGING_API_BASE}/api/tagging/jobs/${encodeURIComponent(jobId)}/retry`, "POST", request, { success: false, data: null, error: "tagging-service unreachable" });
}
