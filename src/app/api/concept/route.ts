import { GLOSSARY_SERVICE_BASE as GLOSSARY_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute, withRequestSearch } from "@/lib/api/serverProxy";

export async function GET(request: Request) {
  return proxyGetJson(withRequestSearch(`${GLOSSARY_API_BASE}/v1/glossary/concepts`, request), {
      success: false,
      data: null,
      error: "glossary-service unreachable",
    });
}
