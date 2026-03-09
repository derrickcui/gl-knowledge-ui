import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyGetJsonWithSearch, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${RUNTIME_API_BASE}/api/runtime/deployments`, request, { success: false, data: null, error: "runtime-service unreachable" },
  );
}
