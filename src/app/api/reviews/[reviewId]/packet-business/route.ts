import { REVIEWS_SERVICE_BASE as REVIEWS_API_BASE } from "@/lib/api/serverServiceConfig";
import { proxyTextRoute } from "@/lib/api/serverProxy";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;
  return proxyTextRoute({
    url: `${REVIEWS_API_BASE}/api/reviews/${reviewId}/packet-business`,
    errorBody: {
      success: false,
      data: null,
      error: "review-service unreachable",
    },
  });
}
