import { ProjectHome } from '@/app/components/shell/ProjectHome';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectHome projectId={decodeURIComponent(projectId)} />;
}
