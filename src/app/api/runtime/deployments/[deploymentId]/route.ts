import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params;
  return proxyGetJson(
    `${RUNTIME_API_BASE}/api/runtime/deployments/${encodeURIComponent(deploymentId)}`,
    { success: false, data: null, error: "runtime-service unreachable" }
  );
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params;
  return proxyMutationJson(
    `${RUNTIME_API_BASE}/api/runtime/deployments/${encodeURIComponent(deploymentId)}`,
    "DELETE",
    undefined,
    { success: false, data: null, error: "runtime-service unreachable" }
  );
}
