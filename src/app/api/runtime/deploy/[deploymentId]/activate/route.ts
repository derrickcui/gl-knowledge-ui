import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../../topics/proxyUtils";

const RUNTIME_API_BASE =
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params;
  try {
    const body = await request.text();
    const upstream = await fetch(
      `${RUNTIME_API_BASE}/api/runtime/deploy/${encodeURIComponent(deploymentId)}/activate`,
      {
        method: "POST",
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
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "runtime-service unreachable" },
      { status: 502 }
    );
  }
}
