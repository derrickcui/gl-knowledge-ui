import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute, proxyMutationJson, withRequestSearch } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${RUNTIME_API_BASE}/api/runtime/environments`, "POST", request, {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    });
}

export async function GET(request: Request) {
  return proxyGetJson(withRequestSearch(`${RUNTIME_API_BASE}/api/runtime/environments`, request), {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    });
}
