import { NextRequest } from "next/server";
import { ADMIN_TOPICSETS_SERVICE_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

async function proxyAiTopicSet(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST"
) {
  const { path } = await context.params;
  const tail = path.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(`${ADMIN_TOPICSETS_SERVICE_BASE}/api/ai/topicset/${tail}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  return proxyJsonRoute({
    url: upstreamUrl.toString(),
    method,
    request,
    errorBody: { success: false, data: null, error: "topicset-ai-service unreachable" },
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiTopicSet(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiTopicSet(request, context, "POST");
}
