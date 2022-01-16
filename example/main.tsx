import React from 'react';
import ReactDOM from 'react-dom';
import App from './app';
import { Context, root } from './model';
import { StoreProvider } from './store-provider';

const context: Context = {
  getRandomNumber() {
    return Math.floor(Math.random() * 9) + 1;
  },
};

const LOCAL_STORAGE_KEY = 'valtio-factory-root-state';

const initialState = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');

const rootStore = root
  .subscribeSnapshot((state) => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  })
  .create(context, initialState);

const element = (
  <StoreProvider rootStore={rootStore}>
    <App />
  </StoreProvider>
);

ReactDOM.render(element, document.getElementById('root'));
