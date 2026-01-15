import PageClient from "./page-client";
import { fetchGlossaryAuditLogs } from "@/lib/api";

export default async function AuditPage() {
  // 只加载第一页（最近的一批）
  const data = await fetchGlossaryAuditLogs({ limit: 20 });

  return (
    <PageClient
      initialItems={data.items}
      initialCursor={data.nextCursor}
      initialHasMore={data.hasMore}
    />
  );
}
