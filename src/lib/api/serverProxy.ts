import { NextResponse } from "next/server";

const REPLACEMENT = "\uFFFD";

type ProxyInit = {
  url: string;
  method?: string;
  request?: Request;
  cache?: RequestCache;
  errorBody: Record<string, unknown>;
  requestHeaderNames?: string[];
  responseHeaderNames?: string[];
  responseContentType?: string;
  transformBody?: (body: string, upstream: Response) => string | Promise<string>;
};

type ProxyOptions = Omit<ProxyInit, "url" | "method" | "request" | "errorBody">;

function countReplacement(text: string) {
  let count = 0;
  for (const ch of text) {
    if (ch === REPLACEMENT) count += 1;
  }
  return count;
}

function normalizeCharset(contentType: string | null) {
  if (!contentType) return "";
  const match = contentType.match(/charset=([^;]+)/i);
  return match ? match[1].trim().toLowerCase() : "";
}

function mapCharset(label: string) {
  if (label === "gbk" || label === "gb2312" || label === "gb18030") {
    return "gb18030";
  }
  return label;
}

function decodeBuffer(buffer: ArrayBuffer, label: string) {
  try {
    return new TextDecoder(label).decode(buffer);
  } catch {
    return null;
  }
}

function buildUpstreamRequestHeaders(
  request: Request | undefined,
  method: string,
  headerNames: string[]
) {
  const headers = new Headers();

  for (const headerName of headerNames) {
    const value = request?.headers.get(headerName);
    if (value) headers.set(headerName, value);
  }

  if (request && !headers.has("content-type") && method !== "GET" && method !== "HEAD") {
    headers.set(
      "content-type",
      request.headers.get("content-type") ?? "application/json"
    );
  }

  return headers;
}

function buildProxyResponseHeaders(
  upstream: Response,
  contentType: string,
  headerNames: string[]
) {
  const headers = new Headers();
  headers.set("content-type", contentType);

  for (const headerName of headerNames) {
    const value = upstream.headers.get(headerName);
    if (value) headers.set(headerName, value);
  }

  return headers;
}

export function withRequestSearch(url: string, request: Request) {
  const search = new URL(request.url).search;
  return `${url}${search || ""}`;
}

export function joinUrlPath(baseUrl: string, ...segments: Array<string | number>) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = segments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/");
  return `${normalizedBase}/${normalizedPath}`;
}

export async function readUpstreamJsonBody(
  upstream: Response
): Promise<string> {
  const buffer = await upstream.arrayBuffer();
  const charset = mapCharset(
    normalizeCharset(upstream.headers.get("content-type"))
  );

  const primaryLabel = charset && charset !== "utf-8" ? charset : "utf-8";
  const primaryText = decodeBuffer(buffer, primaryLabel);
  if (!primaryText) {
    return decodeBuffer(buffer, "utf-8") ?? "";
  }

  const replacementCount = countReplacement(primaryText);
  if (replacementCount === 0) return primaryText;

  if (primaryLabel !== "gb18030") {
    const gbkText = decodeBuffer(buffer, "gb18030");
    if (gbkText && countReplacement(gbkText) < replacementCount) {
      return gbkText;
    }
  }

  return primaryText;
}

export async function proxyJsonRoute({
  url,
  method = "GET",
  request,
  cache = "no-store",
  errorBody,
  requestHeaderNames = [],
  responseHeaderNames = [],
  responseContentType = "application/json; charset=utf-8",
  transformBody,
}: ProxyInit) {
  try {
    const normalizedMethod = method.toUpperCase();
    const requestBody =
      request && normalizedMethod !== "GET" && normalizedMethod !== "HEAD"
        ? await request.text()
        : undefined;
    const upstream = await fetch(url, {
      method: normalizedMethod,
      headers: buildUpstreamRequestHeaders(
        request,
        normalizedMethod,
        requestHeaderNames
      ),
      body: requestBody,
      cache,
    });
    const rawBody = await readUpstreamJsonBody(upstream);
    const body = transformBody ? await transformBody(rawBody, upstream) : rawBody;
    return new NextResponse(body, {
      status: upstream.status,
      headers: buildProxyResponseHeaders(
        upstream,
        responseContentType,
        responseHeaderNames
      ),
    });
  } catch {
    return NextResponse.json(errorBody, { status: 502 });
  }
}

export async function proxyTextRoute({
  url,
  method = "GET",
  request,
  cache = "no-store",
  errorBody,
  requestHeaderNames = [],
  responseHeaderNames = [],
  responseContentType = "application/json",
  transformBody,
}: ProxyInit) {
  try {
    const normalizedMethod = method.toUpperCase();
    const requestBody =
      request && normalizedMethod !== "GET" && normalizedMethod !== "HEAD"
        ? await request.text()
        : undefined;
    const upstream = await fetch(url, {
      method: normalizedMethod,
      headers: buildUpstreamRequestHeaders(
        request,
        normalizedMethod,
        requestHeaderNames
      ),
      body: requestBody,
      cache,
    });
    const rawBody = await upstream.text();
    const body = transformBody ? await transformBody(rawBody, upstream) : rawBody;
    return new NextResponse(body, {
      status: upstream.status,
      headers: buildProxyResponseHeaders(
        upstream,
        upstream.headers.get("content-type") ?? responseContentType,
        responseHeaderNames
      ),
    });
  } catch {
    return NextResponse.json(errorBody, { status: 502 });
  }
}

export function proxyGetJson(
  url: string,
  errorBody: Record<string, unknown>,
  options?: ProxyOptions
) {
  return proxyJsonRoute({
    url,
    errorBody,
    ...(options ?? {}),
  });
}

export function proxyGetJsonWithSearch(
  baseUrl: string,
  request: Request,
  errorBody: Record<string, unknown>,
  options?: ProxyOptions
) {
  return proxyJsonRoute({
    url: withRequestSearch(baseUrl, request),
    request,
    errorBody,
    ...(options ?? {}),
  });
}

export function proxyMutationJson(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  request: Request | undefined,
  errorBody: Record<string, unknown>,
  options?: ProxyOptions
) {
  return proxyJsonRoute({
    url,
    method,
    request,
    errorBody,
    ...(options ?? {}),
  });
}
