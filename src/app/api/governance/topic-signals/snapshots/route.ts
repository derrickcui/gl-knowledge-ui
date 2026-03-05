import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../topics/proxyUtils";
import { SEARCH_API_BASE } from "../../coverage/shared";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const upstream = await fetch(`${SEARCH_API_BASE}/api/governance/topic-signals/snapshots`, {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: payload || "{}",
    });
    const body = await readUpstreamJsonBody(upstream);
    return new NextResponse(body, {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "governance-service unreachable" },
      { status: 502 }
    );
  }
}
