import { NextRequest } from "next/server";
import { SEARCH_API_BASE } from "../shared";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(request: NextRequest) {
  const url = new URL(`${SEARCH_API_BASE}/api/governance/coverage/distribution`);
  const datasetName = request.nextUrl.searchParams.get("datasetName");
  if (datasetName) {
    url.searchParams.set("datasetName", datasetName);
  }
  return proxyGetJson(url.toString(), { success: false, data: null, error: "governance-service unreachable" });
}
