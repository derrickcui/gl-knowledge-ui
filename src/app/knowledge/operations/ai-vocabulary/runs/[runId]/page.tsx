import { RunDetailView } from "./run-detail-view";

export default async function AiVocabularyRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <RunDetailView runId={runId} />;
}
