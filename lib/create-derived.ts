import { derive } from 'valtio/utils';
import { WithContext } from './types';

export type DerivedProps<State extends {}, Context extends {}, Actions extends {}, U extends {}> = {
  [K in keyof U]: (state: State & WithContext<Context> & Actions) => U[K];
};

type DeriveGet<T extends {}> = (proxyObject: T) => T;

type DerivedFns<State extends {}, U extends {}> = {
  [K in keyof U]: (get: DeriveGet<State>) => U[K];
};

/**
 * Combine an existing valtio state proxy with derived properties.
 */
export function createDerived<State extends {}, U extends {}>(
  state: State,
  derivedProps: DerivedProps<State, any, any, U>,
) {
  const obj: Partial<DerivedFns<State, U>> = {};
  for (const key of Object.keys(derivedProps)) {
    const k = key as keyof typeof derivedProps;
    obj[k] = (get: DeriveGet<State>) => derivedProps[k](get(state));
  }
  return derive(obj as DerivedFns<State, U>, { proxy: state });
}

/**
 * Merge two objects of derived properties.
 * This is simply a helper function to preserve TypeScript types.
 *
 * @param d1 First derived properties object.
 * @param d2 Second derived properties object.
 * @returns Merged object.
 */
export function combineDerivedProps<
  U1 extends {},
  U2 extends {},
  S extends {},
  C extends {},
  A extends {},
>(d1: DerivedProps<S, C, A, U1>, d2: DerivedProps<S, C, A, U2>): DerivedProps<S, C, A, U1 & U2> {
  return { ...d1, ...d2 } as DerivedProps<S, C, A, U1 & U2>;
}
