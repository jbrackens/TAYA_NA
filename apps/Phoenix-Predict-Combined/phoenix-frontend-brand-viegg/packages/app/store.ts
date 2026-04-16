import { configureStore } from "@reduxjs/toolkit";

import { storeConfig } from "@phoenix-ui/app";

export default configureStore({
  reducer: {
    ...storeConfig.reducer,
  },
  middleware: [...storeConfig.middleware],
  enhancers: [...storeConfig.enhancers],
  devTools: true,
});
