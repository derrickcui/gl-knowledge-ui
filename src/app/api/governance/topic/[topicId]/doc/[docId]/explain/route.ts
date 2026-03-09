import { NextRequest } from "next/server";
import { SEARCH_API_BASE } from "@/app/api/governance/coverage/shared";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ topicId: string; docId: string }> }
) {
  const { topicId, docId } = await context.params;
  const url = new URL(
    `${SEARCH_API_BASE}/api/governance/topic/${encodeURIComponent(
      topicId
    )}/doc/${encodeURIComponent(docId)}/explain`
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });
  return proxyGetJson(url.toString(), { success: false, data: null, error: "governance-service unreachable" });
}
