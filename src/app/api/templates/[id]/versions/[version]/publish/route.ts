import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  return proxyMutationJson(
    `${TEMPLATE_API_BASE}/api/templates/${id}/versions/${version}/publish`,
    "POST",
    _request,
    { success: false, data: null, error: "template-service unreachable" }
  );
}
