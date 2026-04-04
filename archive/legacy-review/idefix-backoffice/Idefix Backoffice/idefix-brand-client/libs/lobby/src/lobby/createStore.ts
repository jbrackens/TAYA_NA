// TODO: initialize store via @redux/toolkit

// TODO: remove redux-devtools-extension/developmentOnly after toolkit initialization
import { composeWithDevTools } from "redux-devtools-extension/developmentOnly";
import thunkMiddleware from "redux-thunk";
import {
  createStore as createReduxStore,
  applyMiddleware,
  Reducer
} from "@reduxjs/toolkit";

import { ThunkExtraArgument } from "./types";

export default function createStore(
  reducer: Reducer,
  initialState: Record<string, unknown> | undefined,
  thunkExtraArgument: ThunkExtraArgument
) {
  if (initialState) {
    return createReduxStore(
      reducer,
      initialState,
      composeWithDevTools(
        applyMiddleware(thunkMiddleware.withExtraArgument(thunkExtraArgument))
      )
    );
  }

  return createReduxStore(
    reducer,
    composeWithDevTools(
      applyMiddleware(thunkMiddleware.withExtraArgument(thunkExtraArgument))
    )
  );
}
