import { NextRequest } from "next/server";
import { resolveTopicSetServiceBase } from "@/lib/api/serviceRouting";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

async function proxyTopicSetsPath(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
) {
  const { path } = await context.params;
  const tail = path.map(encodeURIComponent).join("/");
  const upstreamUrl = new URL(
    `${resolveTopicSetServiceBase(path)}/api/topicsets/${tail}`
  );
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  return proxyJsonRoute({
    url: upstreamUrl.toString(),
    method,
    request,
    errorBody: { success: false, data: null, error: "topicset-service unreachable" },
    requestHeaderNames: ["if-match", "if-none-match"],
    responseHeaderNames: ["etag", "cache-control", "last-modified"],
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetsPath(request, context, "GET");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetsPath(request, context, "POST");
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetsPath(request, context, "PUT");
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetsPath(request, context, "DELETE");
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyTopicSetsPath(request, context, "PATCH");
}
