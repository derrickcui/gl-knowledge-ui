import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/environments/${encodeURIComponent(id)}`, "PUT", request, {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyGetJson(`${RUNTIME_API_BASE}/api/runtime/environments/${encodeURIComponent(id)}`, {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    });
}
