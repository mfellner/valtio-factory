import { WithContext } from './types';

export type Actions<State extends {}, Context extends {}> = Record<
  string,
  (this: State & WithContext<Context>, ...args: any[]) => void | Promise<void>
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
  A2 extends Actions<State, Context>,
>(a1: A1, a2: A2): A1 & A2 {
  return { ...a1, ...a2 };
}
