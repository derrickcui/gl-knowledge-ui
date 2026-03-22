import { TAGGING_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, withRequestSearch } from "@/lib/api/serverProxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  return proxyGetJson(
    withRequestSearch(
      `${TAGGING_API_BASE}/api/tagging/jobs/${encodeURIComponent(jobId)}/logs`,
      request
    ),
    { success: false, data: null, error: "tagging-service unreachable" }
  );
}
