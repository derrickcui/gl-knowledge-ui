import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "@/app/api/topics/proxyUtils";

const TOPICSETS_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

async function proxyTopicSets(request: Request, method: "GET" | "POST") {
  try {
    const upstream = await fetch(`${TOPICSETS_API_BASE}/api/topicsets`, {
      method,
      headers:
        method === "POST"
          ? {
              "content-type":
                request.headers.get("content-type") ?? "application/json",
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
      { success: false, data: null, error: "topicset-service unreachable" },
      { status: 502 }
    );
  }
}

export async function GET(request: Request) {
  return proxyTopicSets(request, "GET");
}

export async function POST(request: Request) {
  return proxyTopicSets(request, "POST");
}

