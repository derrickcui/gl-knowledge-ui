import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../proxyUtils";

const TOPICS_API_BASE =
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function GET(request: Request) {
  try {
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(
      `${TOPICS_API_BASE}/api/topics/search`
    );
    incomingUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const upstream = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
    });
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
