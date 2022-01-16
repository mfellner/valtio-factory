/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from './app';
import { root } from './model';
import { StoreProvider } from './store-provider';

/* eslint-disable valtio/state-snapshot-rule */

const getRandomNumber = () => 1;

describe('App', () => {
  test('increment and reset', async () => {
    const rootStore = root.create({ getRandomNumber }, { counter: { count: 0 } });

    render(
      <StoreProvider rootStore={rootStore}>
        <App />
      </StoreProvider>,
    );

    fireEvent.click(screen.getByText('increment'));

    expect(await screen.findByTestId('count')).toHaveTextContent('The current count is 1');

    fireEvent.click(screen.getByText('reset'));

    expect(await screen.findByTestId('count')).toHaveTextContent('The current count is 0');
  });

  test('input text', async () => {
    const rootStore = root.create({ getRandomNumber }, { counter: { count: 0 } });

    render(
      <StoreProvider rootStore={rootStore}>
        <App />
      </StoreProvider>,
    );

    fireEvent.change(screen.getByLabelText('user-input'), { target: { value: 'Hello' } });

    await waitFor(() => {
      expect(rootStore.user.user?.name).toBe('Hello');
    });
  });
});
