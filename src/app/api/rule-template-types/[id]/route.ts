import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyGetJson(
    `${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(id)}`,
    {
      success: false,
      data: null,
      error: "template-service unreachable",
    }
  );
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyMutationJson(`${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(id)}`, "PUT", request, {
      success: false,
      data: null,
      error: "template-service unreachable",
    });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyMutationJson(
    `${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(id)}`,
    "DELETE",
    undefined,
    {
      success: false,
      data: null,
      error: "template-service unreachable",
    }
  );
}
