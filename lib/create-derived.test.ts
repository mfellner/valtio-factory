import { proxy, snapshot, subscribe } from 'valtio';
import { combineDerivedProps, createDerived, DerivedProps } from './create-derived';

test('createDerived', () => {
  const p = proxy({ x: 1 });

  const derived = createDerived(p, {
    y: (state) => (state.x * 2).toFixed(),
  });

  derived.x = 2;

  subscribe(
    derived,
    () => {
      const { x, y } = snapshot(derived);
      expect(x).toBe(2);
      expect(y).toBe('4');
    },
    /*notifyInSync*/ true,
  );

  expect.assertions(2);
});

test('combineDerivedProps', () => {
  const state = { x: 1 } as const;

  const d1: DerivedProps<typeof state, { y: string }> = {
    y: (s) => (s.x * 2).toFixed(),
  };
  const d2: DerivedProps<typeof state, { z: boolean }> = {
    z: (s) => s.x % 2 === 0,
  };

  const d = combineDerivedProps(d1, d2);

  expect(d.y(state)).toBe('2');
  expect(d.z(state)).toBe(false);
});
