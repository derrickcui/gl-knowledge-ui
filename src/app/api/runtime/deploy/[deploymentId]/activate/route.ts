import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params;
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/deploy/${encodeURIComponent(deploymentId)}/activate`, "POST", request, { success: false, data: null, error: "runtime-service unreachable" });
}
