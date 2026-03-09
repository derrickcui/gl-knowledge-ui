import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  return proxyGetJson(`${TEMPLATE_API_BASE}/api/templates/${id}/versions/${version}`, {
    success: false,
    data: null,
    error: "template-service unreachable",
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  return proxyMutationJson(`${TEMPLATE_API_BASE}/api/templates/${id}/versions/${version}`, "PUT", request, { success: false, data: null, error: "template-service unreachable" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  return proxyMutationJson(
    `${TEMPLATE_API_BASE}/api/templates/${id}/versions/${version}`,
    "DELETE",
    undefined,
    { success: false, data: null, error: "template-service unreachable" }
  );
}
