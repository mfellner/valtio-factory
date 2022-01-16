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
  test('useSnapshot', async () => {
    const counter = createFactory({ x: 0 })
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
          <button onClick={() => counter.inc()}>increment</button>
        </div>
      );
    }

    render(<Counter />);

    fireEvent.click(screen.getByText('increment'));

    expect(await screen.findByTestId('count')).toHaveTextContent('1');
  });
});
