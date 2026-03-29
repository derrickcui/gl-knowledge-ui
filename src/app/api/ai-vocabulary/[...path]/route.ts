import { DATA_INGEST_SERVICE_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

function buildAiVocabularyUrl(request: Request, path: string[]) {
  const base = `${DATA_INGEST_SERVICE_BASE}/${path
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
  const search = new URL(request.url).search;
  return `${base}${search || ""}`;
}

async function proxyAiVocabulary(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyJsonRoute({
    url: buildAiVocabularyUrl(request, path),
    method,
    request,
    errorBody: {
      success: false,
      data: null,
      error: "data-ingest-service unreachable",
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiVocabulary("GET", request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiVocabulary("POST", request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiVocabulary("PUT", request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiVocabulary("PATCH", request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyAiVocabulary("DELETE", request, context);
}
