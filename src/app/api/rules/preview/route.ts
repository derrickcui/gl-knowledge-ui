import { RULES_SERVICE_BASE as RULE_PREVIEW_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${RULE_PREVIEW_API_BASE}/api/rules/preview`, "POST", request, {
      error: "rule-preview-service unreachable",
    });
}
