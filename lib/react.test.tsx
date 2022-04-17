/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { useSnapshot } from 'valtio';
import { createFactory } from './store-factory';

/* eslint-disable valtio/state-snapshot-rule */

describe('with react', () => {
  test('useSnapshot with actions and derived properties', async () => {
    const counter = createFactory({ x: 0 })
      .derived({
        y(state) {
          return state.x * 2;
        },
      })
      .actions({
        inc() {
          this.x += 1;
        },
      })
      .create();

    function Counter() {
      const state = useSnapshot(counter);

      return (
        <div>
          <p data-testid="count">count: {state.x}</p>
          <p data-testid="derivedCount">derived: {state.y}</p>
          <button onClick={() => counter.inc()}>increment</button>
        </div>
      );
    }

    render(<Counter />);

    fireEvent.click(screen.getByText('increment'));

    expect(await screen.findByTestId('count')).toHaveTextContent('1');
    expect(await screen.findByTestId('derivedCount')).toHaveTextContent('2');
  });

  test('useSnapshot with composed stores', async () => {
    type Context = { baz: string };

    const foo = createFactory<{ x: number }, Context>({ x: 0 }).actions({
      inc() {
        this.x += 1;
      },
    });

    const bar = createFactory<{ y: number }, Context>({ y: 0 })
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

    const store = createFactory<{ foo: typeof foo; bar: typeof bar }, Context>({
      foo,
      bar,
    })
      .subscribeSnapshot(() => {
        //
      })
      .create({ baz: 'baz' }, { foo: { x: 1 }, bar: { y: 1 } });

    function Counter() {
      const { bar } = store;
      const barState = useSnapshot(bar);

      return (
        <div>
          <p data-testid="count">count: {barState.y}</p>
          <p data-testid="derivedCount">derived: {barState.y2}</p>
          <button onClick={() => bar.inc()}>increment</button>
        </div>
      );
    }

    render(<Counter />);

    fireEvent.click(screen.getByText('increment'));

    expect(await screen.findByTestId('count')).toHaveTextContent('2');
    expect(await screen.findByTestId('derivedCount')).toHaveTextContent('4');
  });
});
