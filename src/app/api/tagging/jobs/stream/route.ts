import { NextRequest, NextResponse } from "next/server";

import { SEARCH_SERVICE_BASE as TAGGING_API_BASE } from "@/lib/api/serverServiceConfig";

type StreamPayload = {
  at: string;
  jobId: string;
  data: unknown;
  error?: string;
};

function sseFrame(payload: StreamPayload) {
  return `event: snapshot\ndata: ${JSON.stringify(payload)}\n\n`;
}

function pingFrame() {
  return `event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`;
}

async function fetchJob(jobId: string) {
  const res = await fetch(`${TAGGING_API_BASE}/api/tagging/jobs/${encodeURIComponent(jobId)}`, {
    cache: "no-store",
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, error: text || `job request failed (${res.status})` };
  }
  try {
    return { ok: true, data: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "invalid job response" };
  }
}

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId")?.trim();
  const intervalMsRaw = Number(request.nextUrl.searchParams.get("intervalMs") ?? "2000");
  const intervalMs = Number.isFinite(intervalMsRaw)
    ? Math.max(1000, Math.min(10000, intervalMsRaw))
    : 2000;

  if (!jobId) {
    return NextResponse.json(
      { success: false, data: null, error: "jobId is required" },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const encoder = new TextEncoder();

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        controller.enqueue(encoder.encode(chunk));
      };

      const emitSnapshot = async () => {
        const now = new Date().toISOString();
        try {
          const snapshot = await fetchJob(jobId);
          if (snapshot.ok) {
            safeEnqueue(
              sseFrame({
                at: now,
                jobId,
                data: snapshot.data,
              })
            );
            return;
          }
          safeEnqueue(
            sseFrame({
              at: now,
              jobId,
              data: null,
              error: snapshot.error,
            })
          );
        } catch {
          safeEnqueue(
            sseFrame({
              at: now,
              jobId,
              data: null,
              error: "stream fetch failed",
            })
          );
        }
      };

      emitSnapshot();
      const snapshotTimer = setInterval(emitSnapshot, intervalMs);
      const pingTimer = setInterval(() => safeEnqueue(pingFrame()), 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(snapshotTimer);
        clearInterval(pingTimer);
        controller.close();
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

