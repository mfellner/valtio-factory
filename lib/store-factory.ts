import { proxy, ref, snapshot, subscribe } from 'valtio';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { derive } from 'valtio/utils';
import { Actions, composeActions } from './compose-actions';
import { combineDerivedProps, createDerived, DerivedProps } from './create-derived';
import { ParametersAfterSecond, Snapshot, UnsubscribeFn, WithContext } from './types';

type AdditionalSubscribeArgs = ParametersAfterSecond<typeof subscribe>;

/**
 * Subscription callback function that will receive the state (or snapshot) as a
 * first argument, the context as a second argument, and the rest of the arguments
 * of valtio's {@link subscribe} function.
 */
type SubscriptionFn<State extends {}, Context> = (
  state: State,
  context: Context,
  ...args: Parameters<Parameters<typeof subscribe>[1]>
) => void;

type Subscription<S extends {}, Context> = [SubscriptionFn<S, Context>, ...AdditionalSubscribeArgs];

/**
 * Create a new store factory.
 * @template State The type of the proxy state created by the factory.
 * @template Context The type of the transitive context object provided to actions (default: void).
 * @param initialState Required initial state.
 * @returns The store factory.
 */
export function createFactory<State extends {}, Context = void>(
  initialState: State,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore TODO FIXME: Context should extend {} but also remain optional.
): Factory<State, Context, {}, {}> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore TODO FIXME: Context should extend {} but also remain optional.
  return factory<State, Context, {}, {}>({
    baseState: initialState,
    baseActions: {},
    baseDerivedProps: {},
    baseSubscriptions: [],
    unsubscriptions: [],
    onCreateFns: [],
  });
}

type FactoryResult<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}> = {
  [key in keyof S]: ResultFromFactory<S[key]>;
} & A &
  U &
  WithContext<C>;

/**
 * Callback that is passed to the onCreate method of the factory. It receives the
 * raw proxy state object.
 * The function optionally returns an unsubcribe function that will be called when
 * `state.$unsubscribe()` is called.
 */
type OnCreateFn<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}> = (
  state: FactoryResult<S, C, A, U>,
) => UnsubscribeFn | void;

const isFactoryProp = Symbol('isFactory');

function isFactory(obj: any): obj is Factory<any, any, any, any> {
  return obj instanceof Object && obj[isFactoryProp] === true;
}

/**
 * @typeParam S - State
 * @typeParam C - Context
 * @typeParam A - Actions
 * @typeParam U - Derived properties
 */
export interface Factory<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}> {
  [isFactoryProp]: true;
  /**
   * Declare action handlers on the proxy state object.
   * @param actions Object with action handlers.
   * @returns The store factory.
   * @example
   * ```ts
   *  createFactory({ count: 0 })
   *  .actions({
   *    increment() {
   *      this.count += 1;
   *    },
   *  });
   * ```
   */
  actions<A2 extends Actions<S & U, C, A>>(actions2: A2): Factory<S, C, A & A2, U>;

  /**
   * Declare derived properties with the {@link derive} utility.
   * @param derivedProps Object with methods that receive the current state and return derived properties.
   * @returns The store factory.
   * @example
   * ```ts
   *  createFactory({ count: 1 })
   *  .derived({
   *    doubled(state) {
   *      return state.count * 2;
   *    },
   *  });
   * ```
   * @see https://github.com/pmndrs/valtio#derive-util
   */
  derived<U2 extends {}>(derivedProps2: DerivedProps<S, C, A, U2>): Factory<S, C, A, U & U2>;

  /**
   * Subscribe to the full state object.
   * @param subscription Function ({@link SubscriptionFn}) that will receive the current state.
   * @param args Additinal arguments of the {@link subscribe} function.
   * @returns The store factory.
   * @example
   * ```ts
   *  createFactory({ count: 1 })
   *  .subscribe((state) => {
   *    console.log(state.count);
   *  });
   * ```
   * @see https://github.com/pmndrs/valtio#subscribe-from-anywhere
   */
  subscribe(
    subscription: SubscriptionFn<S, C>,
    ...args: AdditionalSubscribeArgs
  ): Factory<S, C, A, U>;

  /**
   * Subscribe to a snaphshot of the full state object.
   * @param subscription Function that will receive a snapshot of the current state.
   * @param args Additinal arguments of the {@link subscribe} function.
   * @returns The store factory.
   * @example
   * ```ts
   *  createFactory({ count: 1 })
   *  .subscribeSnapshot((snap) => {
   *    // `snap` is an immutable object
   *    console.log(snap.count);
   *  });
   * ```
   * @see https://github.com/pmndrs/valtio#subscribe-from-anywhere
   * @see https://github.com/pmndrs/valtio#use-it-vanilla
   */
  subscribeSnapshot(
    subscription: SubscriptionFn<UnwrappedSnapshot<S & WithContext<C>>, C>,
    ...args: AdditionalSubscribeArgs
  ): Factory<S, C, A, U>;

  /**
   * Add a callback for when the `create` method of the factory is called.
   * @param fn Function ({@link OnCreateFn}) that will be called with the proxy state object.
   * This function may return an _unsubscribe_ callback that will be called
   * when the `$unsubscribe()` function on the store is called.
   * @returns The store factory.
   * @example
   * ```ts
   *  createFactory({ count: 0 }).onCreate((state) => {
   *    subscribeKey(state, 'count', (n) => {
   *      console.log('current count:', n);
   *    });
   *  });
   * ```
   */
  onCreate(fn: OnCreateFn<S, C, A, U>): Factory<S, C, A, U>;

  /**
   * Create the proxy state object with {@link proxy}.
   * @param context An instance of Context (default is `undefined` / `void`).
   * @param initialState An optional, partial initialisation state. Must be derived from the State type.
   * @returns Proxy state object.
   */
  create<S2 extends S>(
    context: C,
    initialState?: Partial<{ [key in keyof S2]: InitialStateFromFactory<S2[key]> }>,
  ): FactoryResult<S, C, A, U>;
}

type StateFromFactory<F extends Factory<any, any, any, any>> = F extends Factory<
  infer S,
  any,
  any,
  any
>
  ? S extends { [key: string]: object }
    ? {
        [K in keyof S]: InitialStateFromFactory<S[K]>;
      }
    : S
  : never; // there's already a contraint that requires F to be a factory so this case can never happen

type InitialStateFromFactory<T> = T extends Factory<any, any, any, any>
  ? Partial<StateFromFactory<T>>
  : T;

type ResultFromFactory<T> = T extends Factory<any, any, any, any> ? ReturnType<T['create']> : T;

/** Unwraps a snpashot from a factory. */
type UnwrappedFactory<T extends object> = T extends Factory<infer S, infer C, any, any>
  ? UnwrappedSnapshot<S & WithContext<C>>
  : T extends Factory<infer S2, any, any, any>
  ? UnwrappedSnapshot<S2 & WithContext<any>>
  : Snapshot<T>;

/** Necessary to unwrap a snapshot from nested factories. */
type UnwrappedSnapshot<T extends object> = T extends { [key: string]: object }
  ? Snapshot<{
      [K in keyof T]: UnwrappedFactory<T[K]>;
    }>
  : Snapshot<T>;

/**
 * Get the type of the store returned by a factory's `create` method.
 */
export type Store<T extends Factory<any, any, any, any>> = ResultFromFactory<T>;

function factory<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}>({
  baseState,
  baseActions,
  baseDerivedProps,
  baseSubscriptions,
  unsubscriptions,
  onCreateFns,
}: {
  baseState: S;
  baseActions: A;
  baseDerivedProps: DerivedProps<S, C, A, U>;
  baseSubscriptions: Subscription<S, C>[];
  unsubscriptions: Array<() => void>;
  onCreateFns: OnCreateFn<S, C, A, U>[];
}): Factory<S, C, A, U> {
  return {
    [isFactoryProp]: true,

    actions: <A2 extends Actions<S & U, C, A>>(actions: A2) => {
      return factory<S, C, A & A2, U>({
        baseState,
        baseActions: composeActions<S & U, C, A, A2>(baseActions, actions),
        baseDerivedProps,
        baseSubscriptions,
        unsubscriptions,
        onCreateFns,
      });
    },

    derived: <U2 extends {}>(derivedProps: DerivedProps<S, C, A, U2>) => {
      return factory<S, C, A, U & U2>({
        baseState,
        baseActions,
        baseDerivedProps: combineDerivedProps(baseDerivedProps, derivedProps),
        baseSubscriptions,
        unsubscriptions,
        onCreateFns,
      });
    },

    subscribe: (subscription: SubscriptionFn<S, C>, ...args: AdditionalSubscribeArgs) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions: [...baseSubscriptions, [subscription, ...args]],
        unsubscriptions,
        onCreateFns,
      });
    },

    subscribeSnapshot: (
      subscription: SubscriptionFn<UnwrappedSnapshot<S & WithContext<C>>, C>,
      ...args: AdditionalSubscribeArgs
    ) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions: [
          ...baseSubscriptions,
          [
            (state, ...restArgs) =>
              subscription(snapshot(state) as UnwrappedSnapshot<S & WithContext<C>>, ...restArgs),
            ...args,
          ],
        ],
        unsubscriptions,
        onCreateFns,
      });
    },

    onCreate: (fn: OnCreateFn<S, C, A, U>) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions,
        unsubscriptions,
        onCreateFns: [...onCreateFns, fn],
      });
    },

    create: <S2 extends S>(
      context: C,
      initialState?: Partial<{ [key in keyof S2]: InitialStateFromFactory<S2[key]> }>,
    ): FactoryResult<S, C, A, U> => {
      // Remove any derived properties from the initial state
      // in order to prevent a conflict.
      if (initialState) {
        for (const key of Object.keys(baseDerivedProps)) {
          if (key in initialState) {
            delete initialState[key as keyof typeof initialState];
          }
        }
      }

      const mergedState = { ...baseState, ...initialState };

      // Since the final `derivedProxy` will only be initialized further down below, this
      // container is used to hold the value for the $getParent handler that must already
      // be added to the intermediate state object at this earlier point.
      // Prevents `ReferenceError: Cannot access 'derivedProxy' before initialization`
      const parentContainer: { $parent?: typeof derivedProxy } = {};
      const $getParent = ref(() => parentContainer.$parent);

      // Resolve any state properties that are actually other factories.
      for (const [key, value] of Object.entries(baseState)) {
        if (isFactory(value)) {
          mergedState[key as keyof typeof mergedState] = value.create(context, {
            ...initialState?.[key as keyof typeof initialState],
            $getParent,
          });
        }
      }

      const $unsubscribe = () => {
        for (const unsub of unsubscriptions) {
          unsub();
        }
      };

      const stateProxy: S & A & WithContext<C> = proxy({
        ...mergedState,
        ...baseActions,
        $context: ref(context || ({} as C)),
        $unsubscribe,
      });

      // `derivedProxy` is the fully formed proxy state object.
      const derivedProxy: S & A & U & WithContext<C> = createDerived(stateProxy, baseDerivedProps);
      parentContainer.$parent = derivedProxy;

      for (const [subscribtion, ...args] of baseSubscriptions) {
        const unsubscription = subscribe(
          derivedProxy,
          (ops) => {
            subscribtion(derivedProxy, context, ops);
          },
          ...args,
        );
        unsubscriptions.push(unsubscription);
      }

      const unsubscribeFns = onCreateFns
        .map((fn) => fn(derivedProxy as FactoryResult<S, C, A, U>))
        .filter((fn): fn is UnsubscribeFn => Boolean(fn));

      // Add the unsubscribe functions returned by onCreate functions to the rest of the
      // unsubscribe functions. They will be called when `state.$unsubscribe()` is called.
      unsubscriptions.push(...unsubscribeFns);

      return derivedProxy as FactoryResult<S, C, A, U>;
    },
  };
}
