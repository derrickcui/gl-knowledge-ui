import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "./proxyUtils";

const TOPICS_API_BASE =
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function GET() {
  try {
    const upstream = await fetch(
      `${TOPICS_API_BASE}/api/topics`,
      { cache: "no-store" }
    );
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "topic-service unreachable",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const upstream = await fetch(
      `${TOPICS_API_BASE}/api/topics`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            request.headers.get("content-type") ??
            "application/json",
        },
        body,
      }
    );
    const responseBody = await readUpstreamJsonBody(upstream);
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "topic-service unreachable",
      },
      { status: 502 }
    );
  }
}
