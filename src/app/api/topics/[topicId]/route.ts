import { TOPICS_SERVICE_BASE as TOPICS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyGetJson } from "@/lib/api/serverProxy";

function parseJsonObject(body: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickTemplateId(data: Record<string, unknown>) {
  return (
    data.template_id ??
    data.templateId ??
    null
  );
}

function pickTemplateVersion(data: Record<string, unknown>) {
  return (
    data.template_version ??
    data.templateVersion ??
    null
  );
}

function ensureTemplateFields(body: string): string {
  const root = parseJsonObject(body);
  if (!root) return body;
  const data = root.data;
  if (!data || typeof data !== "object") return body;

  const dataObj = data as Record<string, unknown>;
  const templateId = pickTemplateId(dataObj);
  const templateVersion = pickTemplateVersion(dataObj);

  root.data = {
    ...dataObj,
    template_id: templateId,
    template_version: templateVersion,
  };

  return JSON.stringify(root);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  return proxyGetJson(`${TOPICS_API_BASE}/api/topics/${topicId}`, 
    {
      success: false,
      data: null,
      error: "topic-service unreachable",
    },
    { transformBody: ensureTemplateFields }
  );
}
