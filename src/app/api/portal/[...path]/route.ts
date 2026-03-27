import { SEARCH_SERVICE_BASE } from "@/lib/api/serverServiceConfig";
import { proxyJsonRoute } from "@/lib/api/serverProxy";

function buildPortalUrl(request: Request, path: string[]) {
  const base = `${SEARCH_SERVICE_BASE}/api/portal/${path
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
  const search = new URL(request.url).search;
  return `${base}${search || ""}`;
}

async function proxyPortal(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return proxyJsonRoute({
    url: buildPortalUrl(request, path),
    method,
    request,
    errorBody: { success: false, data: null, error: "portal-service unreachable" },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyPortal("GET", request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyPortal("POST", request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyPortal("PUT", request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyPortal("PATCH", request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyPortal("DELETE", request, context);
}
