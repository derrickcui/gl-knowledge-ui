export async function approveReview(reviewId: string, expectedHash?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/reviews/${reviewId}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: "APPROVE",
        expectedHash: expectedHash ?? null,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      ...err,
    };
  }

  const payload = await res.json().catch(() => ({}));
  if (payload?.success === false) {
    throw {
      status: res.status,
      ...(payload.error ?? {}),
    };
  }
  return payload;
}

export async function publishReview(reviewId: string, expectedHash?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/reviews/${reviewId}/publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedHash: expectedHash ?? null,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      ...err,
    };
  }

  const payload = await res.json().catch(() => ({}));
  if (payload?.success === false) {
    throw {
      status: res.status,
      ...(payload.error ?? {}),
    };
  }
  return payload;
}

export async function rejectReview(
  reviewId: string,
  reason: string,
  expectedHash?: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/reviews/${reviewId}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision: "REJECT",
        comment: reason,
        expectedHash: expectedHash ?? null,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      ...err,
    };
  }

  const payload = await res.json().catch(() => ({}));
  if (payload?.success === false) {
    throw {
      status: res.status,
      ...(payload.error ?? {}),
    };
  }
  return payload;
}

export async function fetchReviewPacketBusiness(
  reviewId: string
): Promise<any> {
  const res = await fetch(
    `/api/reviews/${reviewId}/packet-business`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw {
      status: res.status,
      ...err,
    };
  }
  const payload = await res.json().catch(() => ({}));
  if (payload?.success === false) {
    throw {
      status: res.status,
      ...(payload.error ?? {}),
    };
  }
  return payload?.data ?? payload;
}
