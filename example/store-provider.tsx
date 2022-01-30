import React, { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import { RootStore } from './model';

const storeContext = createContext<RootStore | null>(null);

type StoreProviderProps = PropsWithChildren<{ rootStore: RootStore }>;

export function StoreProvider({ rootStore, children }: StoreProviderProps) {
  // Unsubscribe from all updates on unmount.
  useEffect(() => {
    return () => {
      rootStore.counter.$unsubscribe();
      rootStore.user.$unsubscribe();
      rootStore.$unsubscribe();
    };
  }, [rootStore]);

  return <storeContext.Provider value={rootStore}>{children}</storeContext.Provider>;
}

export function useStore() {
  const rootStore = useContext(storeContext);
  if (!rootStore) {
    throw new Error('RootStore not provided.');
  }
  return rootStore;
}
