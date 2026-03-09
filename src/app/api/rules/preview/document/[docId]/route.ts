import { RULES_SERVICE_BASE as RULE_PREVIEW_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { docId } = await params;
  return proxyGetJson(`${RULE_PREVIEW_API_BASE}/api/rules/preview/document/${encodeURIComponent(docId)}`, {
      error: "rule-preview-service unreachable",
    });
}
