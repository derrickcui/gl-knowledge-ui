import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyGetJsonWithSearch, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJsonWithSearch(`${RUNTIME_API_BASE}/api/runtime/deploy`, request, { success: false, data: null, error: "runtime-service unreachable" },
  );
}

export async function POST(request: Request) {
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/deploy`, "POST", request, { success: false, data: null, error: "runtime-service unreachable" },
  );
}
