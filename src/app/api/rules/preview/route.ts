import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../topics/proxyUtils";

const RULE_PREVIEW_API_BASE =
  process.env.NEXT_PUBLIC_RUNTIME_API ??
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const upstream = await fetch(`${RULE_PREVIEW_API_BASE}/api/rules/preview`, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("content-type") ?? "application/json",
      },
      body,
    });
    const responseBody = await readUpstreamJsonBody(upstream);
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "rule-preview-service unreachable",
      },
      { status: 502 }
    );
  }
}

