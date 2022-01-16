import { derive } from 'valtio/utils';

export type DerivedProps<State extends {}, U extends {}> = {
  [K in keyof U]: (state: State) => U[K];
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
  derivedProps: DerivedProps<State, U>,
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
export function combineDerivedProps<U1 extends {}, U2 extends {}, State extends {}>(
  d1: DerivedProps<State, U1>,
  d2: DerivedProps<State, U2>,
): DerivedProps<State, U1 & U2> {
  return { ...d1, ...d2 } as DerivedProps<State, U1 & U2>;
}
