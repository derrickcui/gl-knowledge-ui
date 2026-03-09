import { RULES_SERVICE_BASE as RULE_RUNTIME_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${RULE_RUNTIME_API_BASE}/api/rules/runtime/compare`, "POST", request, {
      errorCode: "UPSTREAM_UNREACHABLE",
      message: "rule-runtime-service unreachable",
    });
}
