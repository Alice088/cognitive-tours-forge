import { MapStoreProvider } from '@/app/components/shell/MapStoreProvider';
import { MapWorkspace } from '@/app/components/shell/MapWorkspace';

export const dynamic = 'force-dynamic';

export default async function MapPage({ params }: { params: Promise<{ projectId: string; mapFile: string }> }) {
  const { projectId, mapFile } = await params;
  return (
    <MapStoreProvider>
      <MapWorkspace projectId={decodeURIComponent(projectId)} mapFile={decodeURIComponent(mapFile)} />
    </MapStoreProvider>
  );
}
