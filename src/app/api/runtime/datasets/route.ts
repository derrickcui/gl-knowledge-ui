import { RUNTIME_SERVICE_BASE as RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

export async function GET() {
  return proxyGetJson(`${RUNTIME_API_BASE}/api/runtime/datasets`, {
      success: false,
      data: null,
      error: "runtime-service unreachable",
    },
  );
}
