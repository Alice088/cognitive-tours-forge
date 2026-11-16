'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { createMapStore, type MapStore } from '@/app/lib/store/map-store';

const MapStoreContext = createContext<MapStore | null>(null);

export function MapStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createMapStore());
  return <MapStoreContext.Provider value={store}>{children}</MapStoreContext.Provider>;
}

export function useMapStore(): MapStore {
  const store = useContext(MapStoreContext);
  if (!store) {
    throw new Error('useMapStore must be used inside MapStoreProvider');
  }
  return store;
}
