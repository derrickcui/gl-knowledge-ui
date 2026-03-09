import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readRoute(relativePath: string) {
  return readFileSync(relativePath, "utf8");
}

describe("api proxy architecture", () => {
  it("keeps topicsets root route on the low-level proxy for header passthrough", () => {
    const route = readRoute("src/app/api/topicsets/route.ts");

    expect(route).toContain("proxyJsonRoute({");
    expect(route).toContain('requestHeaderNames: ["if-match", "if-none-match"]');
    expect(route).toContain('responseHeaderNames: ["etag", "cache-control", "last-modified"]');
  });

  it("keeps topicsets catch-all route on the low-level proxy for header passthrough", () => {
    const route = readRoute("src/app/api/topicsets/[...path]/route.ts");

    expect(route).toContain("proxyJsonRoute({");
    expect(route).toContain('requestHeaderNames: ["if-match", "if-none-match"]');
    expect(route).toContain('responseHeaderNames: ["etag", "cache-control", "last-modified"]');
  });
});
