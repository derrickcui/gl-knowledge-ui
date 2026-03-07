import { NextRequest, NextResponse } from "next/server";
import { readUpstreamJsonBody } from "@/app/api/topics/proxyUtils";
import { SEARCH_API_BASE } from "@/app/api/governance/coverage/shared";

async function proxyTopicSetSearch(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST"
) {
  try {
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

    const upstream = await fetch(upstreamUrl.toString(), {
      method,
      headers:
        method === "POST"
          ? {
              "content-type": request.headers.get("content-type") ?? "application/json",
            }
          : undefined,
      body: method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "topicset-search-service unreachable" },
      { status: 502 }
    );
  }
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

