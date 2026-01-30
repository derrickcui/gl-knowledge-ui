import { NextResponse } from "next/server";

const REVIEWS_API_BASE =
  process.env.NEXT_PUBLIC_TOPICS_API ??
  "http://localhost:8080";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await params;
    const upstream = await fetch(
      `${REVIEWS_API_BASE}/api/reviews/${reviewId}/packet-business`,
      { cache: "no-store" }
    );
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ??
          "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "review-service unreachable",
      },
      { status: 502 }
    );
  }
}
