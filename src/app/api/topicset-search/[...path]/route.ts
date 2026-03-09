import { NextRequest } from "next/server";
import { SEARCH_API_BASE } from "@/app/api/governance/coverage/shared";
import { proxyGetJson, proxyMutationJson } from "@/lib/api/serverProxy";

async function proxyTopicSetSearch(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST"
) {
  const { path } = await context.params;
  const tail = path.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(
    path[0] === "internal"
      ? `${SEARCH_API_BASE}/${tail}`
      : `${SEARCH_API_BASE}/api/${tail}`
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  if (method === "GET") {
    return proxyGetJson(upstreamUrl.toString(), {
      success: false,
      data: null,
      error: "topicset-search-service unreachable",
    });
  }

  return proxyMutationJson(upstreamUrl.toString(), method, request, {
    success: false,
    data: null,
    error: "topicset-search-service unreachable",
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetSearch(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetSearch(request, context, "POST");
}
