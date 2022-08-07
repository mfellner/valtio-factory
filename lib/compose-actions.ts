import type { Factory } from './store-factory';
import { WithContext } from './types';

type ResultFromFactory<T> = T extends Factory<any, any, any, any> ? ReturnType<T['create']> : T;

type FactoryResult<S extends {}, C extends {}, A extends Actions<S, C>> = {
  [key in keyof S]: ResultFromFactory<S[key]>;
} & A &
  WithContext<C>;

export type Actions<
  State extends {},
  Context extends {},
  Actions_ extends Actions<State, Context> = {},
> = Record<
  string,
  (this: FactoryResult<State, Context, Actions_>, ...args: any[]) => any | Promise<any>
>;

/**
 * Merge two actions objects into one.
 * This is simply a helper function to preserve TypeScript types.
 *
 * @param a1 First actions object.
 * @param a2 Second actions object.
 * @returns Merged actions object.
 */
export function composeActions<
  State extends {},
  Context extends {},
  A1 extends Actions<State, Context>,
  A2 extends Actions<State, Context, A1>,
>(a1: A1, a2: A2): A1 & A2 {
  return { ...a1, ...a2 };
}
