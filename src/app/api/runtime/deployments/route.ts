import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../topics/proxyUtils";

const RUNTIME_API_BASE =
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function GET(request: Request) {
  try {
    const reqUrl = new URL(request.url);
    const search = reqUrl.search || "";
    const upstream = await fetch(`${RUNTIME_API_BASE}/api/runtime/deployments${search}`, {
      cache: "no-store",
    });
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
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
