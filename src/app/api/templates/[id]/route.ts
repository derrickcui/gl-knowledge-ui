import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates/${id}`,
      { cache: "no-store" }
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates/${id}`,
      { method: "DELETE" }
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
