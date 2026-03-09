import { RULES_SERVICE_BASE as RULE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyGetJson(`${RULE_API_BASE}/api/rules/${encodeURIComponent(id)}/versions`, {
      errorCode: "UPSTREAM_UNREACHABLE",
      message: "rule-service unreachable",
    });
}
