import { RULES_SERVICE_BASE as RULE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${RULE_API_BASE}/api/rules/analyze`, "POST", request, {
      errorCode: "UPSTREAM_UNREACHABLE",
      message: "rule-service unreachable",
    });
}
