import { resolveTopicServiceBase } from "@/lib/api/serviceRouting";
import { proxyJsonRoute, proxyMutationJson } from "@/lib/api/serverProxy";

export async function POST(request: Request) {
  return proxyMutationJson(`${resolveTopicServiceBase("simulate-impact")}/api/topics/simulate-impact`, "POST", request, { success: false, data: null, error: "topic-service unreachable" });
}
