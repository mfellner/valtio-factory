import { snapshot, subscribe } from 'valtio';
import { subscribeKey } from 'valtio/utils';
import { createFactory, Store } from './store-factory';
import { UnsubscribeFn } from './types';

describe('store-factory', () => {
  test('basic example without context and initialisation state', () => {
    const state = createFactory({ count: 0 }).create();

    expect(state.count).toBe(0);
  });

  test('initial state in create', () => {
    const state = createFactory({ count: 0 }).create(undefined, { count: 1 });

    expect(state.count).toBe(1);
  });

  test('derived', () => {
    const state = createFactory({ count: 1 })
      .derived({
        doubled(state) {
          return state.count * 2;
        },
      })
      .create();

    expect(state.doubled).toBe(2);
  });

  test('derived properties in initialisation state should be ingored', () => {
    const state = createFactory({ count: 1 })
      .derived({
        doubled(state) {
          return state.count * 2;
        },
      })
      // @ts-expect-error derived properties
      // are not allowed in initialisation state
      .create(undefined, { doubled: 0 });

    expect(state.doubled).toBe(2);
  });

  test('derived property handlers receive state with extra attributes', () => {
    const state = createFactory<{ count: number }, { test: string }>({ count: 1 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .derived({
        doubled(state) {
          const context: { test: string } = state.$context;
          const unsubscribe: UnsubscribeFn = state.$unsubscribe;
          const count: number = state.count;
          const increment: () => void = state.increment;

          expect(context).toEqual({ test: 'test' });
          expect(unsubscribe).toBeInstanceOf(Function);
          expect(count).toEqual(1);
          expect(increment).toBeInstanceOf(Function);

          return state.count * 2;
        },
      })
      .create({ test: 'test' });

    expect(state.doubled).toBe(2);
    expect.assertions(5);
  });

  test('simple action', () => {
    const state = createFactory({ count: 1 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .create();

    state.increment();
    state.increment();
    expect(state.count).toBe(3);
  });

  test('action with return type', () => {
    const state = createFactory({ count: 1 })
      .actions({
        doubleAndReturn(): number {
          this.count *= 2;
          return this.count;
        },
      })
      .create();

    const value: number = state.doubleAndReturn();
    expect(value).toBe(2);
    expect(state.count).toBe(2);
  });

  test('action calling other action', () => {
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

    state.increment(1);
    state.double();
    expect(state.count).toBe(2);
  });

  test('action based on derived property', () => {
    const state = createFactory({ count: 1 })
      .derived({
        doubled(state) {
          return state.count * 2;
        },
      })
      .actions({
        double() {
          this.count = this.doubled;
        },
      })
      .create();

    state.double();
    expect(state.count).toBe(2);
  });

  test('with context in actions', () => {
    const state = createFactory<{ count: number }, { n: number }>({ count: 0 })
      .actions({
        increment() {
          this.count += this.$context.n;
        },
      })
      .create({ n: 42 });

    state.increment();
    expect(state.count).toBe(42);
  });

  test('subscribe', () => {
    let count = 0;

    const state = createFactory({ count: 0 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .subscribe((state) => {
        count = state.count;
      }, /* notifyInSync */ true)
      .create();

    state.increment();
    expect(count).toBe(1);

    state.increment();
    expect(count).toBe(2);
  });

  test('subscribeSnapshot', () => {
    let count = 0;

    const state = createFactory({ count: 0 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .subscribeSnapshot((snap) => {
        count = snap.count;
      }, /* notifyInSync */ true)
      .create();

    state.increment();
    expect(count).toBe(1);
  });

  test('subscribe and subscribeSnapshot should receive context', () => {
    type State = { count: number };

    const context = { fn: jest.fn() };
    type Context = typeof context;

    const state = createFactory<State, Context>({ count: 0 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .subscribe((_, context) => {
        context.fn();
      }, /* notifyInSync */ true)
      .subscribeSnapshot((_, context) => {
        context.fn();
      }, /* notifyInSync */ true)
      .create(context);

    state.increment();
    expect(context.fn).toHaveBeenCalledTimes(2);
  });

  test('onCreate passes the proxy state object', () => {
    let count = 0;

    const state = createFactory({ count: 0 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .onCreate((state) => {
        subscribeKey(
          state,
          'count',
          (n) => {
            count = n;
          },
          true,
        );
      })
      .create();

    state.increment();
    expect(count).toBe(1);
  });

  test('onCreate can be chained and unsubscriptions will be called', () => {
    const unsub1 = jest.fn();
    const unsub2 = jest.fn();

    const fn1 = jest.fn(() => unsub1);
    const fn2 = jest.fn(() => unsub2);

    const state = createFactory({ count: 0 })
      .onCreate(() => fn1())
      .onCreate(() => fn2())
      .create();

    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);

    state.$unsubscribe();

    expect(unsub1).toHaveBeenCalledTimes(1);
    expect(unsub2).toHaveBeenCalledTimes(1);
  });

  test('$unsubscribe unsubscribes all subscriptions', () => {
    let count1 = 0;
    let count2 = 0;
    let count3 = 0;

    const state = createFactory({ count: 0 })
      .actions({
        increment() {
          this.count += 1;
        },
      })
      .subscribe((snap) => {
        count1 = snap.count;
      }, /* notifyInSync */ true)
      .subscribeSnapshot((snap) => {
        count2 = snap.count;
      }, /* notifyInSync */ true)
      .onCreate((state) => {
        return subscribeKey(
          state,
          'count',
          (n) => {
            count3 = n;
          },
          true,
        );
      })
      .create();

    state.increment();
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    expect(count3).toBe(1);

    state.$unsubscribe();
    state.increment();
    expect(count1).toBe(1);
    expect(count2).toBe(1);
    expect(count3).toBe(1);
  });

  test('compose factories', () => {
    const context = {
      buzz: 'yes',
    };

    const bar = createFactory<{ x: number }, typeof context>({ x: 0 }).actions({
      dec() {
        if (this.$context.buzz === 'yes') {
          this.x -= 1;
        }
      },
    });

    const foo = createFactory<{ bar: typeof bar }>({ bar });

    const baz = createFactory<{ y: string }, typeof context>({ y: 'hello' }).actions({
      uppercase() {
        this.y = this.y.toUpperCase();
      },
    });

    const root = createFactory<{ foo: typeof foo; baz: typeof baz }, typeof context>({
      foo,
      baz,
    }).subscribeSnapshot((snap, context) => {
      // assertions to typcheck that snap is an unwrapped, plain object that also includes context properties
      const $context: typeof context = snap.$context;
      const $unsubscribe: Function = snap.$unsubscribe;

      const buzz: string = context.buzz;
      const y: string = snap.baz.y;
      const foo: { bar: { x: number } } = snap.foo;
      const x: number = snap.foo.bar.x;

      const $context1: typeof context = snap.foo.bar.$context;
      const $getParent1: Function | undefined = snap.foo.bar.$getParent;
      const $unsubscribe1: Function = snap.foo.bar.$unsubscribe;

      expect(buzz).toBeDefined();
      expect(y).toBeDefined();
      expect(x).toBeDefined();
      expect(foo).toBeDefined();

      expect($context).toBeDefined();
      expect($context).toEqual(context);
      expect($unsubscribe).toBeDefined();

      expect($context1).toBeDefined();
      expect($context1).toEqual(context);
      expect($getParent1).toBeDefined();
      expect($unsubscribe1).toBeDefined();
    });

    const state = root.create(context, {
      foo: {
        bar: {
          x: 43,
        },
      },
      baz: {
        y: 'world',
      },
    });

    state.foo.bar.dec();
    expect(state.foo.bar.x).toBe(42);

    state.baz.uppercase();
    expect(state.baz.y).toBe('WORLD');
  });

  test('composed factories with derived properties ', () => {
    const foo = createFactory({ x: 1 }).actions({
      inc() {
        this.x += 1;
      },
    });

    const bar = createFactory({ y: 1 })
      .derived({
        y2(state) {
          return state.y * 2;
        },
      })
      .actions({
        inc() {
          this.y += 1;
        },
      });

    const state = createFactory({
      foo,
      bar,
    }).create();

    state.bar.inc();

    subscribe(
      state,
      () => {
        const snap = snapshot(state);

        expect(snap.bar.y).toEqual(2);
        expect(snap.bar.y2).toEqual(4);
      },
      /* notifyInSync */ true,
    );

    expect.assertions(2);
  });

  test('access parent store', () => {
    const foo = createFactory({ i: 0 }).actions({
      inc() {
        this.i += 1;
      },
    });

    const bar = createFactory({ x: 10 }).actions({
      dec() {
        this.x -= this.$getParent?.<RootStore>()?.foo.i ?? 0;
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

    const state = root.create();

    state.foo.inc();
    state.foo.inc();
    expect(state.foo.i).toBe(2);

    state.bar.dec();
    expect(state.bar.x).toBe(8);
  });
});
