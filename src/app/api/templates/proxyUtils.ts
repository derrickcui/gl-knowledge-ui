const REPLACEMENT = "\uFFFD";

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
