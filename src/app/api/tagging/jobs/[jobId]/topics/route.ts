import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../../topics/proxyUtils";

const TAGGING_API_BASE =
  process.env.NEXT_PUBLIC_TAGGING_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  try {
    const upstream = await fetch(
      `${TAGGING_API_BASE}/api/tagging/jobs/${encodeURIComponent(jobId)}/topics`,
      { cache: "no-store" }
    );
    const responseBody = await readUpstreamJsonBody(upstream);
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "tagging-service unreachable" },
      { status: 502 }
    );
  }
}
