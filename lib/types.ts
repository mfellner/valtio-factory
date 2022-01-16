export type WithContext<Context> = Readonly<{
  /**
   * Transitive context object.
   */
  $context: Context;
  /**
   * Returns the parent store if the factory was nested into a parent factory.
   * @template Parent type of the parent store.
   */
  $getParent?<Parent = unknown>(): Parent | undefined;
}>;

/**
 * Returns the remaining arguments of a function after the second one.
 */
export type ParametersAfterSecond<F> = F extends (arg0: any, arg1: any, ...rest: infer R) => any
  ? R
  : never;
