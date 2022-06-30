// import { snapshot } from 'valtio';

export type UnsubscribeFn = () => void;

export type WithContext<Context> = Readonly<{
  /**
   * Transitive context object.
   */
  $context: Context;
  /**
   * Unsubscribe _all_ subscriptions added to the factory and call the unsubscribe
   * function that was returned by onCreate.
   * This does not include any manual subscriptions on the proxy state itself.
   */
  $unsubscribe: UnsubscribeFn;
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

// /**
//  * Helper type to extract the generic return type of {@link snapshot}.
//  * @see https://stackoverflow.com/a/64919133
//  */
// class Wrapper<T extends object> {
//   snapshot = (proxy: T) => snapshot<T>(proxy);
// }

// export type Snapshot<T extends object> = ReturnType<Wrapper<T>['snapshot']>;

/**
 * Valtio does not export the `Snapshot` type and the above hack is causing
 * Typescript/Parcel to generate excessive type outputs that break the TS compiler.
 * As a workaround, the `Snapshot` type and its dependencies are manually redeclared
 * below.
 */

type AsRef = {
  $$valtioRef: true;
};

type AnyFunction = (...args: any[]) => any;

export type Snapshot<T> = T extends AnyFunction
  ? T
  : T extends AsRef
  ? T
  : T extends Promise<infer V>
  ? Snapshot<V>
  : {
      readonly [K in keyof T]: Snapshot<T[K]>;
    };
