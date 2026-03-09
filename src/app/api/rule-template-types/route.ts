import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET() {
  return proxyGetJson(`${TEMPLATE_API_BASE}/api/rule-template-types`, {
    success: false,
    data: null,
    error: "template-service unreachable",
  });
}

export async function POST(request: Request) {
  return proxyMutationJson(
    `${TEMPLATE_API_BASE}/api/rule-template-types`,
    "POST",
    request,
    {
      success: false,
      data: null,
      error: "template-service unreachable",
    }
  );
}
