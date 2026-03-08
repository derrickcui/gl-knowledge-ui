import { NextRequest, NextResponse } from "next/server";
import { readUpstreamJsonBody } from "@/app/api/topics/proxyUtils";

const TOPICSETS_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

function buildProxyRequestHeaders(
  request: NextRequest,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
) {
  const headers = new Headers();
  const ifMatch = request.headers.get("if-match");
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifMatch) headers.set("if-match", ifMatch);
  if (ifNoneMatch) headers.set("if-none-match", ifNoneMatch);

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    headers.set(
      "content-type",
      request.headers.get("content-type") ?? "application/json"
    );
  }

  return headers;
}

function buildProxyResponseHeaders(upstream: Response) {
  const headers = new Headers();
  headers.set("content-type", "application/json; charset=utf-8");

  const etag = upstream.headers.get("etag");
  if (etag) headers.set("etag", etag);

  const cacheControl = upstream.headers.get("cache-control");
  if (cacheControl) headers.set("cache-control", cacheControl);

  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) headers.set("last-modified", lastModified);

  return headers;
}

async function proxyTopicSetsPath(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
) {
  try {
    const { path } = await context.params;
    const tail = path.map(encodeURIComponent).join("/");
    const upstreamUrl = new URL(`${TOPICSETS_API_BASE}/api/topicsets/${tail}`);
    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.append(key, value);
    });

    const upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers: buildProxyRequestHeaders(request, method),
      body:
        method === "POST" || method === "PUT" || method === "PATCH"
          ? await request.text()
          : undefined,
      cache: "no-store",
    });
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: buildProxyResponseHeaders(upstream),
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "topicset-service unreachable" },
      { status: 502 }
    );
  }
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
