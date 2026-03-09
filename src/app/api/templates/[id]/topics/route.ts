import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyGetJson(`${TEMPLATE_API_BASE}/api/templates/${id}/topics`, { success: false, data: null, error: "template-service unreachable" });
}
