import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../topics/proxyUtils";

const ANALYTICS_API_BASE =
  process.env.NEXT_PUBLIC_ADMIN_API ??
  process.env.NEXT_PUBLIC_TAGGING_API ??
  process.env.NEXT_PUBLIC_ANALYTICS_API ??
  process.env.NEXT_PUBLIC_SEARCH_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function GET() {
  try {
    const upstream = await fetch(
      `${ANALYTICS_API_BASE}/api/analytics/runtime-status`,
      { cache: "no-store" }
    );
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "analytics-service unreachable" },
      { status: 502 }
    );
  }
}
