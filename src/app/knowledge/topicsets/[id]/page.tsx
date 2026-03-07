import { TopicSetWorkspaceClient } from "./workspace-client";

export default async function TopicSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TopicSetWorkspaceClient initialTopicSetId={decodeURIComponent(id)} />;
}
