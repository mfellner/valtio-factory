import { proxy, snapshot, subscribe } from 'valtio';
import { combineDerivedProps, createDerived, DerivedProps } from './create-derived';

test('createDerived should create object with derived properties', () => {
  const p = proxy({ x: 1 });

  const derived = createDerived(p, {
    y: (state) => (state.x * 2).toFixed(),
  });

  expect(derived.x).toEqual(1);
  expect(derived.y).toEqual('2');
});

test('createDerived', () => {
  const p = proxy({ x: 1 });

  const derived = createDerived(p, {
    y: (state) => (state.x * 2).toFixed(),
  });

  derived.x = 2;

  expect(p.x).toBe(2);
  expect(derived.x).toBe(2);
  expect(derived.y).toBe('2'); // derived properties only update in subscriptions

  subscribe(
    derived,
    () => {
      const { x, y } = snapshot(derived);
      expect(x).toBe(2);
      expect(y).toBe('4');
    },
    /*notifyInSync*/ true,
  );

  expect.assertions(5);
});

test('combineDerivedProps', () => {
  const state = { x: 1, $context: {}, $unsubscribe: () => undefined } as const;

  const d1: DerivedProps<typeof state, {}, {}, { y: string }> = {
    y: (s) => (s.x * 2).toFixed(),
  };
  const d2: DerivedProps<typeof state, {}, {}, { z: boolean }> = {
    z: (s) => s.x % 2 === 0,
  };

  const d = combineDerivedProps(d1, d2);

  expect(d.y(state)).toBe('2');
  expect(d.z(state)).toBe(false);
});
