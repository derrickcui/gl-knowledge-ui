import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../topics/proxyUtils";

const RULE_API_BASE =
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const upstream = await fetch(
      `${RULE_API_BASE}/api/rules/${encodeURIComponent(id)}/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { cache: "no-store" }
    );
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { errorCode: "UPSTREAM_UNREACHABLE", message: "rule-service unreachable" },
      { status: 502 }
    );
  }
}
