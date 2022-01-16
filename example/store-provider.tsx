import React, { createContext, PropsWithChildren, useContext } from 'react';
import { RootStore } from './model';

const storeContext = createContext<RootStore | null>(null);

type StoreProviderProps = PropsWithChildren<{ rootStore: RootStore }>;

export function StoreProvider({ rootStore, children }: StoreProviderProps) {
  return <storeContext.Provider value={rootStore}>{children}</storeContext.Provider>;
}

export function useStore() {
  const rootStore = useContext(storeContext);
  if (!rootStore) {
    throw new Error('RootStore not provided.');
  }
  return rootStore;
}
