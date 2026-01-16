import { fetchCandidates } from "@/lib/api";
import { PublishedView } from "./published-view";

export default async function PublishedPage() {
  const data = await fetchCandidates({
    status: "APPROVED",
    limit: 10,
    offset: 0,
  });

  return <PublishedView initialData={data} />;
}
