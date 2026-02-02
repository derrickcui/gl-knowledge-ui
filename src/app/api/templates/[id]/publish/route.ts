import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates/${id}/publish`,
      { method: "POST" }
    );
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
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
