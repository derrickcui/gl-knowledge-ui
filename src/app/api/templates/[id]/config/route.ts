import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  try {
    const body = await request.text();
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates/${id}/config`,
      {
        method: "PUT",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
        },
        body,
      }
    );
    const responseBody = await readUpstreamJsonBody(upstream);
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json({ success: false, data: null, error: "template-service unreachable" }, { status: 502 });
  }
}
