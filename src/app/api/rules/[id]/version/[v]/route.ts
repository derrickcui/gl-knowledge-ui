import { RULES_SERVICE_BASE as RULE_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; v: string }> }
) {
  const { id, v } = await params;
  return proxyGetJson(`${RULE_API_BASE}/api/rules/${encodeURIComponent(id)}/version/${encodeURIComponent(v)}`, {
      errorCode: "UPSTREAM_UNREACHABLE",
      message: "rule-service unreachable",
    });
}
