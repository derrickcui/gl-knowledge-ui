import { afterEach, describe, expect, it, vi } from "vitest";
import {
  joinUrlPath,
  proxyGetJsonWithSearch,
  proxyMutationJson,
} from "../api/serverProxy";

describe("serverProxy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("joins and encodes URL path segments", () => {
    expect(joinUrlPath("http://localhost:8081/", "api", "topic sets", "a/b"))
      .toBe("http://localhost:8081/api/topic%20sets/a%2Fb");
  });

  it("preserves request search params for proxied GET requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response('{"ok":true}', {
          status: 200,
          headers: {
            "content-type": "application/json",
            etag: '"abc"',
          },
        })
      );

    const request = new Request(
      "http://localhost:3000/api/topicsets/simulate-overlap?limit=10&minOverlap=2"
    );

    const response = await proxyGetJsonWithSearch(
      "http://localhost:8081/api/topicsets/simulate-overlap",
      request,
      { success: false, error: "unreachable" },
      { responseHeaderNames: ["etag"] }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8081/api/topicsets/simulate-overlap?limit=10&minOverlap=2",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('"abc"');
    await expect(response.text()).resolves.toBe('{"ok":true}');
  });

  it("forwards method, body, and selected headers for mutation requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response('{"success":true}', {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        })
      );

    const request = new Request("http://localhost:3000/api/topicsets", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "if-match": '"v7"',
      },
      body: JSON.stringify({ name: "draft" }),
    });

    const response = await proxyMutationJson(
      "http://localhost:8080/api/topicsets",
      "POST",
      request,
      { success: false, error: "unreachable" },
      { requestHeaderNames: ["if-match"] }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/topicsets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "draft" }),
        cache: "no-store",
        headers: expect.any(Headers),
      })
    );

    const fetchInit = fetchMock.mock.calls[0]?.[1];
    const headers = fetchInit && "headers" in fetchInit ? fetchInit.headers : null;
    expect(headers).toBeInstanceOf(Headers);
    expect((headers as Headers).get("if-match")).toBe('"v7"');
    expect((headers as Headers).get("content-type")).toBe("application/json");
    await expect(response.text()).resolves.toBe('{"success":true}');
  });
});
