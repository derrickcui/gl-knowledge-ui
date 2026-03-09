import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/deploy/validate`, "POST", request, { success: false, data: null, error: "runtime-service unreachable" },
  );
}
