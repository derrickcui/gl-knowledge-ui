import { TEMPLATE_SERVICE_BASE as TEMPLATE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyGetJsonWithSearch, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${TEMPLATE_API_BASE}/api/templates`, request, {
      success: false,
      data: null,
      error: "template-service unreachable",
    },
  );
}

export async function POST(request: Request) {
  return proxyMutationJson(`${TEMPLATE_API_BASE}/api/templates`, "POST", request, {
      success: false,
      data: null,
      error: "template-service unreachable",
    },
  );
}
