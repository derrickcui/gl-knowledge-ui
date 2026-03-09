import { NextRequest } from "next/server";
import { SEARCH_API_BASE } from "../shared";
import { proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: NextRequest) {
  const url = new URL(`${SEARCH_API_BASE}/api/governance/coverage/recompute`);
  const datasetName = request.nextUrl.searchParams.get("datasetName");
  if (datasetName) {
    url.searchParams.set("datasetName", datasetName);
  }
  return proxyMutationJson(url.toString(), "POST", request, {
    success: false,
    data: null,
    error: "governance-service unreachable",
  });
}
