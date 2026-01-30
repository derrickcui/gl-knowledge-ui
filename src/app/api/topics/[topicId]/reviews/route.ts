import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../proxyUtils";

const TOPICS_API_BASE =
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const { topicId } = await params;
    const upstream = await fetch(
      `${TOPICS_API_BASE}/api/topics/${topicId}/reviews`,
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
