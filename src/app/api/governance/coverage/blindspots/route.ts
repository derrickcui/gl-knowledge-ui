import { NextRequest } from "next/server";
import { SEARCH_API_BASE } from "../shared";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(request: NextRequest) {
  const url = new URL(`${SEARCH_API_BASE}/api/governance/coverage/blindspots`);
  const datasetName = request.nextUrl.searchParams.get("datasetName");
  const limit = request.nextUrl.searchParams.get("limit");
  if (datasetName) {
    url.searchParams.set("datasetName", datasetName);
  }
  if (limit) {
    url.searchParams.set("limit", limit);
  }
  return proxyGetJson(url.toString(), { success: false, data: null, error: "governance-service unreachable" });
}
