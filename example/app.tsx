import React from 'react';
import { useSnapshot } from 'valtio';
import { useStore } from './store-provider';

function User() {
  const { user } = useStore();
  const state = useSnapshot(user);

  return (
    <div>
      <input
        aria-label="user-input"
        type="text"
        value={state.user?.name || ''}
        onChange={(event) => {
          const name = event.currentTarget.value;
          user.setUser({ name });
        }}
      />
      {state.user?.name && <p data-testid="user-label">Hello, {state.user.name}!</p>}
    </div>
  );
}

function Counter() {
  const { counter } = useStore();
  const state = useSnapshot(counter);
  const onInc = () => counter.inc();

  return (
    <div>
      <p data-testid="count">{state.currentCountMessage}</p>
      <button onClick={onInc}>increment</button>
    </div>
  );
}

function Resetter() {
  const rootStore = useStore();

  const onReset = () => {
    rootStore.reset();
  };

  return <button onClick={onReset}>reset</button>;
}

export default function App() {
  return (
    <div>
      <User />
      <Counter />
      <Resetter />
    </div>
  );
}
