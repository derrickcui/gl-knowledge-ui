import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return proxyGetJson(`${TAGGING_API_BASE}/api/tagging/jobs/${encodeURIComponent(jobId)}/topics`, { success: false, data: null, error: "tagging-service unreachable" });
}
