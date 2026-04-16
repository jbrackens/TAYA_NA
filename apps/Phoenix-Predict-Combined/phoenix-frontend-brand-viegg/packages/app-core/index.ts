import Components from "./components";
import Providers from "./providers";
import { reducer, middleware, enhancers } from "./store.config";
import {
  Middleware,
  Reducer,
  ReducersMapObject,
  StoreEnhancer,
} from "@reduxjs/toolkit";

type StoreConfig = {
  reducer: Reducer | ReducersMapObject;
  middleware: Middleware[];
  enhancers: StoreEnhancer[];
};

const storeConfig: StoreConfig = {
  reducer,
  middleware,
  enhancers,
};

export { Components, Providers, storeConfig };
