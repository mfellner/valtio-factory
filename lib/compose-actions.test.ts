import { Actions, composeActions } from './compose-actions';

test('composeActions', () => {
  const state = {
    x: 1,
  };
  const context = {
    b: true,
  };
  const that = { ...state, $context: context, $unsubscribe: () => undefined };

  const a1: Actions<typeof state, typeof context> = {
    increment() {
      if (this.$context.b) this.x += 1;
    },
  };
  const a2: Actions<typeof state, typeof context> = {
    decrement() {
      if (this.$context.b) this.x -= 1;
    },
  };

  a1.increment.bind(that);
  a2.decrement.bind(that);

  const a = composeActions<typeof state, typeof context, typeof a1, typeof a2>(a1, a2);

  a.increment.call(that);
  a.increment.call(that);
  a.decrement.call(that);

  expect(that.x).toBe(2);
});
