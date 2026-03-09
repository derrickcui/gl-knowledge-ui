import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyGetJson(`${TEMPLATE_API_BASE}/api/templates/${id}/versions`, {
    success: false,
    data: null,
    error: "template-service unreachable",
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyMutationJson(
    `${TEMPLATE_API_BASE}/api/templates/${id}/versions`,
    "POST",
    request,
    { success: false, data: null, error: "template-service unreachable" }
  );
}
