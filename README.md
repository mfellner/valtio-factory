# valtio-factory 🏭 <!-- omit in toc -->

[![Build Status](https://img.shields.io/github/actions/workflow/status/mfellner/valtio-factory/test.yml?style=flat&colorA=000000&colorB=000000)](https://github.com/mfellner/valtio-factory/actions?query=workflow%3Atest)
[![Codecov](https://img.shields.io/codecov/c/github/mfellner/valtio-factory?colorA=000000&colorB=000000)](https://app.codecov.io/gh/mfellner/valtio-factory)
[![Build Size](https://img.shields.io/bundlephobia/minzip/@mfellner/valtio-factory?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@mfellner/valtio-factory)
[![Version](https://img.shields.io/npm/v/@mfellner/valtio-factory?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@mfellner/valtio-factory)
[![Downloads](https://img.shields.io/npm/dt/@mfellner/valtio-factory.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@mfellner/valtio-factory)

- [Create valtio state using the factory pattern](#create-valtio-state-using-the-factory-pattern)
  - [Motivation](#motivation)
- [Define actions](#define-actions)
  - [Use context](#use-context)
  - [Actions with return types](#actions-with-return-types)
  - [Actions calling other actions](#actions-calling-other-actions)
- [Derive properties](#derive-properties)
- [Provide initial state on initialization](#provide-initial-state-on-initialization)
- [Subscribe](#subscribe)
  - [Subscribe to snapshots](#subscribe-to-snapshots)
  - [Use `onCreate` to subscribe only to portions of the state](#use-oncreate-to-subscribe-only-to-portions-of-the-state)
  - [Unsubscribe](#unsubscribe)
- [Compose factories](#compose-factories)
  - [Access the parent store](#access-the-parent-store)
- [TypeScript](#typescript)
  - [Get the result type of a factory](#get-the-result-type-of-a-factory)
  - [Declare a state type](#declare-a-state-type)
- [Use with React](#use-with-react)
- [Example](#example)

### Create valtio state using the factory pattern

A proxy object is created from initial state.
Existing [valtio](https://github.com/pmndrs/valtio) functions can be used normally.

```ts
import { createFactory } from '@mfellner/valtio-factory';
import { subscribe } from 'valtio';

const state = createFactory({ count: 0 }).create();

state.increment();

subscribe(state, () => console.log('state:', state));
```

#### Motivation

Valtio already offers [several simple recipes](https://github.com/pmndrs/valtio#recipes) for organizing actions, persisting state, and composing states.

This library provides a comprehensive and opinionated solution on top valtio for creating "stores" (state + actions) using the factory pattern. Specifically, it simplifies the following things:

- Separation of store declaration and initialization
- Initializing stores from external data sources (e.g. local storage, async storage)
- Declaring actions and binding them to state
- Declaring derived state and subscriptions
- Injecting dependencies into actions and other state-dependent logic with [context](#use-context)
- Composing multiple stores

valtio-factory was partially inspired by [MobX-State-Tree](https://mobx-state-tree.js.org/intro/welcome).

### Define actions

Actions become methods on the state itself.
This is equivalent to [manually declaring actions as properties of the proxy object](https://github.com/pmndrs/valtio/wiki/How-to-organize-actions#action-methods-defined-in-state).

```ts
const state = createFactory({ count: 0 })
  .actions({
    increment() {
      this.count += 1;
    },
  })
  .create();

state.increment();
```

#### Use context

A context object can be provided to actions and will be available as the property `this.$context`.
The context object will be part of the state as a transitive [`ref`](https://github.com/pmndrs/valtio/blob/main/readme.md#holding-objects-in-state-without-tracking-them) property.

Context can be used to provide external dependencies to actions, e.g. API client instances.

```ts
type State = {
  count: number;
};

type Context = {
  shouldIncrement: boolean;
};

const state = createFactory<State, Context>({ count: 0 })
  .actions({
    increment() {
      if (this.$context.shouldIncrement) state.count += 1;
    },
  })
  .create({ shouldIncrement: true });
```

#### Actions with return types

Actions may also return a value to the caller:

```ts
const state = createFactory({ count: 0 })
  .actions({
    increment(): number {
      this.count += 1;
      return this.count;
    },
  })
  .create();

const n: number = state.increment();
```

#### Actions calling other actions

Actions can call previously defined actions.
Note that it's necessary to call the `actions` factory function twice and only the the second action can call the first action, not the other way around.

```ts
const state = createFactory({ count: 0 })
  .actions({
    increment(n: number) {
      this.count += n;
    },
  })
  .actions({
    double() {
      this.increment(this.count);
    },
  })
  .create();
```

### Derive properties

The `derived` factory function is a convenient wrapper around the [`derive`](https://github.com/pmndrs/valtio/blob/main/readme.md#derive-util) utility.

```ts
const state = createFactory({ count: 0 })
  .derived({
    doubled(state) {
      return state.count * 2;
    },
  })
  .actions({
    double() {
      // Derived properties are available in subsequently declared actions.
      state.count = state.doubled;
    },
  })
  .create();
```

### Provide initial state on initialization

The second argument of the `create` method is used to initialise the proxy and to overwrite the initial state. It's a partial object that can have some but doesn't need all of the state properties.

```ts
const state = createFactory({ count: 0, bool: true }).create(/* context */ undefined, { count: 1 });
```

### Subscribe

It's possible to define [subscriptions](https://github.com/pmndrs/valtio/blob/main/readme.md#subscribe-from-anywhere) on the whole state using the factory pattern.

The subscription callback function receives the state object as a first argument, then the
factory's context, and the rest of valtio's arguments for the subscribe callback last.

```ts
const state = createFactory({ count: 0 })
  .subscribe((state, context) => {
    console.log('current state:', state);
  })
  .create();
```

#### Subscribe to snapshots

To conveniently subscribe to a snapshot of the state, use `subscribeSnapshot`.

```ts
createFactory({ count: 0 }).subscribeSnapshot((snap, context) => {
  // `snap` is an immutable object
});
```

#### Use `onCreate` to subscribe only to portions of the state

You can use the `onCreate` method to declare a callback that will receive the proxy state object when it is created by the factory.

That way you can use all of valtio's utilities like `subscribe` and `subscribeKey` as you normally would.

`onCreate` may optionally return an _unsubscribe_ callback function.

```ts
import { subscribeKey } from 'valtio/utils';

createFactory({ count: 0 }).onCreate((state) => {
  return subscribeKey(state, 'count', (n) => {
    console.log('current count:', n);
  });
});
```

#### Unsubscribe

The store exposes the function `$unsubscribe()` which will unsubscribe all subscriptions added to the factory.
It wil also call the unsubscribe callback returned by the `onCreate` function.

```ts
const state = createFactory({ count: 0 })
  .subscribe((state) => {})
  .onCreate((state) => {
    // The function returned by onCreate will be called when $unsubscribe() is called.
    return subscribeKey(state, 'count', (n) => {});
  })
  .create();

state.$unsubscribe();
```

### Compose factories

You can [compose](https://github.com/pmndrs/valtio/wiki/How-to-split-and-compose-states) factories in order to create a proxy object of nested states.

```ts
const foo = createFactory({ x: 0 }).actions({
  inc() {
    this.x += 1;
  },
});

const bar = createFactory({ y: 0 }).actions({
  dec() {
    this.y -= 1;
  },
});

const root = createFactory({
  foo,
  bar,
});

const state = root.create(context, {
  // The initial state object will use the keys of the factory properties.
  bar: {
    y: 1,
  },
});

// The resulting proxy object will have properties with the individual state objects.
state.foo.inc();
```

#### Access the parent store

When composing factories and their resultant state, the parent store can be accessed with the `$getParent()` method inside actions.

Note that it's currently not possible to anticpate the type of the parent store and wether it will be defined.
Hence it's necessary to supply a type parameter to the $getParent function and to use optional chaining.

```ts
import { createFactory, Store } from '@mfellner/valtio-factory';

const foo = createFactory({ x: 0 }).actions({
  inc() {
    this.x += 1;
  },
});

const bar = createFactory({ y: 0 }).actions({
  dec() {
    this.y -= this.$getParent?.<RootStore>()?.foo.x ?? 0;
  },
});

type FooFactory = typeof foo;
type BarFactory = typeof bar;
type RootState = {
  foo: FooFactory;
  bar: BarFactory;
};
type RootStore = Store<typeof root>;

const root = createFactory<RootState>({
  foo,
  bar,
});
```

### TypeScript

#### Get the result type of a factory

For convenience, you can get the result type of a factory (i.e. the type of the proxy state) with the `Store` helper.

```ts
import { createFactory, Store } from '@mfellner/valtio-factory';

const counterFactory = createFactory({ x: 0 }).actions({
  inc() {
    this.x += 1;
  },
});

type Counter = Store<typeof counterFactory>;

const counter: Counter = counter.create();
```

#### Declare a state type

Using TypeScript type arguments, you can declare optional properties or properties with union types.

```ts
type State = {
  count?: number;
  text: string | null;
};

const state = createFactory<State>({ text: null }).create();
```

### Use with React

Of course you can use valtio-factory with React.

```tsx
const counter = createFactory({ x: 0 })
  .actions({
    inc() {
      this.x += 1;
    },
  })
  .create();

function Counter() {
  // Call `useSnapshot` on the store (i.e. proxy state object).
  const state = useSnapshot(counter);

  // Use action methods directly from the store, not from the state snapshot!
  const onInc = () => counter.inc();

  return (
    <div>
      <p>count: {state.x}</p>
      <button onClick={onInc}>increment</button>
    </div>
  );
}
```

### Example

You can find an example with React and valtio-factory in this repository at [example/](example/) or on [Codesandbox](https://codesandbox.io/s/valtio-factory-example-j7v2s).
