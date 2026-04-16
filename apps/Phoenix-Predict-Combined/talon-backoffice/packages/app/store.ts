import { configureStore } from "@reduxjs/toolkit";

import { reducer, middleware, enhancers } from "./store.config";

export default configureStore({
  reducer,
  middleware,
  enhancers,
  devTools: true,
});
