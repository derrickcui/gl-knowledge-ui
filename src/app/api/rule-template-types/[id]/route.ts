import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../templates/proxyUtils";

const TEMPLATE_API_BASE =
  process.env.NEXT_PUBLIC_TEMPLATE_API ?? "http://localhost:8080";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(
        id
      )}`,
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.text();
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(
        id
      )}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            request.headers.get("content-type") ?? "application/json",
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const upstream = await fetch(
      `${TEMPLATE_API_BASE}/api/rule-template-types/${encodeURIComponent(
        id
      )}`,
      { method: "DELETE" }
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
