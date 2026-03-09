import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";
import { SEARCH_API_BASE } from "@/app/api/governance/coverage/shared";

export async function GET(
  request: Request,
  context: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await context.params;
  const reqUrl = new URL(request.url);
  const url = new URL(
    `${SEARCH_API_BASE}/api/governance/topic/${encodeURIComponent(topicId)}/versions`
  );
  reqUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return proxyGetJson(url.toString(), { success: false, data: null, error: "governance-service unreachable" });
}
