import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "./proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ??
  "http://localhost:8080";

export async function GET(request: Request) {
  try {
    // preserve caller query params (e.g. ?status=draft)
    const reqUrl = new URL(request.url);
    const search = reqUrl.search || "";
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates${search}`,
      { cache: "no-store" }
    );
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "template-service unreachable",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/templates`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            request.headers.get("content-type") ??
            "application/json",
        },
        body,
      }
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
      {
        success: false,
        data: null,
        error: "template-service unreachable",
      },
      { status: 502 }
    );
  }
}
