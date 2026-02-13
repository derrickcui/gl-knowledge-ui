import { NextResponse } from "next/server";
import { readUpstreamJsonBody } from "../proxyUtils";

const TOPICS_API_BASE =
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

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
  try {
    const { topicId } = await params;
    const upstream = await fetch(
      `${TOPICS_API_BASE}/api/topics/${topicId}`,
      { cache: "no-store" }
    );
    const body = ensureTemplateFields(
      await readUpstreamJsonBody(upstream)
    );
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
        error: "topic-service unreachable",
      },
      { status: 502 }
    );
  }
}
