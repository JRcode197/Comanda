import { WorkspaceView } from "@/features/workspace/view";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { orgSlug, path } = await params;
  return (
    <WorkspaceView slug={orgSlug} path={path ?? []} q={await searchParams} />
  );
}
