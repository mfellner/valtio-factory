import { proxy, ref, snapshot, subscribe } from 'valtio';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { derive } from 'valtio/utils';
import { Actions, composeActions } from './compose-actions';
import { combineDerivedProps, createDerived, DerivedProps } from './create-derived';
import { ParametersAfterSecond, Snapshot, WithContext } from './types';

type AdditionalSubscribeArgs = ParametersAfterSecond<typeof subscribe>;

type SubscriptionFn<S extends {}> = (
  state: S,
  ...args: Parameters<Parameters<typeof subscribe>[1]>
) => void;

type Subscription<S extends {}> = [SubscriptionFn<S>, ...AdditionalSubscribeArgs];

/**
 * Create a new store factory.
 * @template State The type of the proxy state created by the factory.
 * @template Context The type of the transitive context object provided to actions (default: void).
 * @param initialState Required initial state.
 * @returns The store factory.
 */
export function createFactory<State extends {}, Context = void>(
  initialState: State,
): Factory<State, Context, {}, {}> {
  return factory<State, Context, {}, {}>({
    baseState: initialState,
    baseActions: {},
    baseDerivedProps: {},
    baseSubscriptions: [],
    onCreate: () => undefined,
  });
}

type FactoryResult<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}> = {
  [key in keyof S]: ResultFromFactory<S[key]>;
} & A &
  U &
  WithContext<C>;

type OnCreateFn<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}> = (
  state: FactoryResult<S, C, A, U>,
) => void;

const isFactoryProp = Symbol('isFactory');

function isFactory(obj: any): obj is Factory<any, any, any, any> {
  return obj instanceof Object && obj[isFactoryProp] === true;
}

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
  actions<A2 extends Actions<S & U, C>>(actions2: A2): Factory<S, C, A & A2, U>;

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
  derived<U2 extends {}>(derivedProps2: DerivedProps<S, U2>): Factory<S, C, A, U & U2>;

  /**
   * Subscribe to the full state object.
   * @param subscription Function that will receive the current state.
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
  subscribe(subscription: SubscriptionFn<S>, ...args: AdditionalSubscribeArgs): Factory<S, C, A, U>;

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
    subscription: SubscriptionFn<Snapshot<S>>,
    ...args: AdditionalSubscribeArgs
  ): Factory<S, C, A, U>;

  /**
   * Add a callback for when the `create` method of the factory is called.
   * @param fn Function that will be called with the proxy state object.
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
  ? S
  : never;

type InitialStateFromFactory<T> = T extends Factory<any, any, any, any>
  ? Partial<StateFromFactory<T>>
  : T;

type ResultFromFactory<T> = T extends Factory<any, any, any, any> ? ReturnType<T['create']> : T;

/**
 * Get the type of the store returned by a factory's `create` method.
 */
export type Store<T extends Factory<any, any, any, any>> = ResultFromFactory<T>;

function factory<S extends {}, C extends {}, A extends Actions<S & U, C>, U extends {}>({
  baseState,
  baseActions,
  baseDerivedProps,
  baseSubscriptions,
  onCreate,
}: {
  baseState: S;
  baseActions: A;
  baseDerivedProps: DerivedProps<S, U>;
  baseSubscriptions: Subscription<S>[];
  onCreate: OnCreateFn<S, C, A, U>;
}): Factory<S, C, A, U> {
  return {
    [isFactoryProp]: true,

    actions: <A2 extends Actions<S & U, C>>(actions: A2) => {
      return factory<S, C, A & A2, U>({
        baseState,
        baseActions: composeActions<S & U, C, A, A2>(baseActions, actions),
        baseDerivedProps,
        baseSubscriptions,
        onCreate,
      });
    },

    derived: <U2 extends {}>(derivedProps: DerivedProps<S, U2>) => {
      return factory<S, C, A, U & U2>({
        baseState,
        baseActions,
        baseDerivedProps: combineDerivedProps(baseDerivedProps, derivedProps),
        baseSubscriptions,
        onCreate,
      });
    },

    subscribe: (subscription: SubscriptionFn<S>, ...args: AdditionalSubscribeArgs) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions: [...baseSubscriptions, [subscription, ...args]],
        onCreate,
      });
    },

    subscribeSnapshot: (
      subscription: SubscriptionFn<Snapshot<S>>,
      ...args: AdditionalSubscribeArgs
    ) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions: [
          ...baseSubscriptions,
          [(state, ...restArgs) => subscription(snapshot(state), ...restArgs), ...args],
        ],
        onCreate,
      });
    },

    onCreate: (fn: OnCreateFn<S, C, A, U>) => {
      return factory<S, C, A, U>({
        baseState,
        baseActions,
        baseDerivedProps,
        baseSubscriptions,
        onCreate: fn,
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

      const $getParent = ref(() => derivedProxy);

      // Resolve any state properties that are actually other factories.
      for (const [key, value] of Object.entries(baseState)) {
        if (isFactory(value)) {
          mergedState[key as keyof typeof mergedState] = value.create(context, {
            ...initialState?.[key as keyof typeof initialState],
            $getParent,
          });
        }
      }

      const stateProxy: S & A & WithContext<C> = proxy({
        ...mergedState,
        ...baseActions,
        $context: ref(context || ({} as C)),
      });

      const derivedProxy: S & A & U & WithContext<C> = createDerived(stateProxy, baseDerivedProps);

      for (const [subscribtion, ...args] of baseSubscriptions) {
        subscribe(
          derivedProxy,
          (ops) => {
            subscribtion(derivedProxy, ops);
          },
          ...args,
        );
      }

      onCreate(derivedProxy as FactoryResult<S, C, A, U>);

      return derivedProxy as FactoryResult<S, C, A, U>;
    },
  };
}
