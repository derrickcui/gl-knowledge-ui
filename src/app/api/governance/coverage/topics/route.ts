import { NextRequest, NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../../../topics/proxyUtils";
import { SEARCH_API_BASE } from "../shared";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(`${SEARCH_API_BASE}/api/governance/coverage/topics`);
    const datasetName = request.nextUrl.searchParams.get("datasetName");
    if (datasetName) {
      url.searchParams.set("datasetName", datasetName);
    }

    const upstream = await fetch(url.toString(), { cache: "no-store" });
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
