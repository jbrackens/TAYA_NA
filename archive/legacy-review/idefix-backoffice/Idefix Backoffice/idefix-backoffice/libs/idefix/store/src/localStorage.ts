import { RootState } from "./rootReducer";

export const REDUX_STATE = "redux-state-v1.4";

export const getPersistedState = () => {
  if (!localStorage.getItem(REDUX_STATE)) {
    return {};
  }

  try {
    return JSON.parse(localStorage.getItem(REDUX_STATE) as string);
  } catch (e) {
    return {};
  }
};

type PersistedState = {
  authentication: RootState["authentication"];
  sidebar: Pick<RootState["sidebar"], "stickyPlayerIds" | "selectedBrand" | "filters">;
  transactions: Pick<RootState["transactions"], "period">;
};

export const setPersistedState = (state: PersistedState) => {
  localStorage.setItem(REDUX_STATE, JSON.stringify(state));
};

export const clearLocalStorage = () => {
  localStorage.removeItem(REDUX_STATE);
};
