import { createFactory, Store } from '../lib';

export type Context = {
  getRandomNumber(): number;
};

type User = {
  name: string;
};

type UserState = {
  user?: User;
};

const user = createFactory<UserState, Context>({}).actions({
  reset() {
    this.user = undefined;
  },
  setUser(user: User) {
    this.user = user;
  },
});

type UserFactory = typeof user;

type CounterState = {
  count: number;
};

const counter = createFactory<CounterState, Context>({
  count: 0,
})
  .actions({
    reset() {
      this.count = 0;
    },
    inc() {
      this.count += this.$context.getRandomNumber();
    },
  })
  .derived({
    currentCountMessage(state) {
      return `The current count is ${state.count}!`;
    },
  });

type CounterFactory = typeof counter;

type RootState = {
  user: UserFactory;
  counter: CounterFactory;
};

export const root = createFactory<RootState, Context>({
  user,
  counter,
}).actions({
  reset() {
    this.counter.reset();
    this.user.reset();
  },
});

export type RootStore = Store<typeof root>;
