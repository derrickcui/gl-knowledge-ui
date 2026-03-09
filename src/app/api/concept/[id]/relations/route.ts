import { GLOSSARY_SERVICE_BASE as GLOSSARY_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson, proxyJsonRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyGetJson(`${GLOSSARY_API_BASE}/v1/candidates/${id}/relations`, {
      success: false,
      data: null,
      error: "glossary-service unreachable",
    });
}
