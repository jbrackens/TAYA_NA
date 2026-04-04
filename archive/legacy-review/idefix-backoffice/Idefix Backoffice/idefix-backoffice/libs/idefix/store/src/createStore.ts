import { configureStore } from "@reduxjs/toolkit";

import { rootReducer } from "./rootReducer";
import { getPersistedState, setPersistedState, clearLocalStorage, REDUX_STATE } from "./localStorage";

const tempStore = configureStore({ reducer: rootReducer });
const initialState = tempStore.getState();
const loadedState = getPersistedState();

const localStorageState = localStorage.getItem(REDUX_STATE);
clearLocalStorage();
localStorage.setItem(REDUX_STATE, localStorageState as string);

const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    ...initialState,
    ...loadedState,
    sidebar: {
      ...initialState.sidebar,
      stickyPlayerIds: loadedState.sidebar ? loadedState.sidebar.stickyPlayerIds : initialState.sidebar.stickyPlayerIds,
      selectedBrand: loadedState.sidebar ? loadedState.sidebar.selectedBrand : initialState.sidebar.selectedBrand,
      filters: loadedState.sidebar ? loadedState.sidebar.filters : initialState.sidebar.filters
    },
    transactions: {
      ...initialState.transactions,
      period: loadedState.transactions ? loadedState.transactions.period : initialState.transactions.period
    }
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }),
  // @ts-ignore
  devTools: process.env.NODE_ENV === "development"
});

type AppDispatch = typeof store.dispatch;

const createStore = () => {
  store.subscribe(() => {
    const state = store.getState();
    setPersistedState({
      authentication: state.authentication,
      sidebar: {
        stickyPlayerIds: state.sidebar.stickyPlayerIds,
        selectedBrand: state.sidebar.selectedBrand,
        filters: state.sidebar.filters
      },
      transactions: {
        period: state.transactions.period
      }
    });
  });

  return store;
};

export { createStore, AppDispatch };
