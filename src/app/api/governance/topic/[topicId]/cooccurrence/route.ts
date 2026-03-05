import { NextRequest, NextResponse } from "next/server";
import { readUpstreamJsonBody } from "@/app/api/topics/proxyUtils";
import { SEARCH_API_BASE } from "@/app/api/governance/coverage/shared";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ topicId: string }> }
) {
  try {
    const { topicId } = await context.params;
    const url = new URL(
      `${SEARCH_API_BASE}/api/governance/topic/${encodeURIComponent(topicId)}/cooccurrence`
    );
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    const upstream = await fetch(url.toString(), { cache: "no-store" });
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "governance-service unreachable" },
      { status: 502 }
    );
  }
}

