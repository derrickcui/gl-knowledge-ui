import PageClient from "./page-client";
import { fetchGlossaryAuditLogs } from "@/lib/api";

export default async function AuditPage() {
  // 只加载第一页（最近的一批）
  const response = await fetchGlossaryAuditLogs({ limit: 20 });
  const data = response.data ?? {
    items: [],
    nextCursor: null,
    hasMore: false,
  };

  return (
    <PageClient
      initialItems={data.items}
      initialCursor={data.nextCursor}
      initialHasMore={data.hasMore}
    />
  );
}
