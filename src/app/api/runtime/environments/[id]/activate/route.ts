import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/environments/${encodeURIComponent(id)}/activate`, "POST", request, {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    });
}
