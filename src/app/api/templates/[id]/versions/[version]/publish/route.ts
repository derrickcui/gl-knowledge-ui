import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../../proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  try {
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates/${id}/versions/${version}/publish`,
      { method: "POST" }
    );
    const responseBody = await readUpstreamJsonBody(upstream);
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "template-service unreachable" },
      { status: 502 }
    );
  }
}
