import { Reducer } from "@reduxjs/toolkit";
import usersSlice from "./lib/slices/usersSlice";
import authSlice from "./lib/slices/authSlice";
import usersDetailsSlice, {
  UsersDetailsSliceState,
} from "./lib/slices/usersDetailsSlice";
import { UsersSliceState } from "./lib/slices/usersSlice";
import auditLogsSlice, { AuditLogsSliceState } from "./lib/slices/logsSlice";
import marketsDetailsSlice, {
  MarketsDetailsSliceState,
} from "./lib/slices/marketsDetailsSlice";
import marketCategoriesSlice, {
  MarketCategoriesSliceState,
} from "./lib/slices/marketCategoriesSlice";

type TalonReducer = {
  auth: Reducer<any>;
  logs: Reducer<AuditLogsSliceState>;
  users: Reducer<UsersSliceState>;
  usersDetails: Reducer<UsersDetailsSliceState>;
  marketsDetails: Reducer<MarketsDetailsSliceState>;
  marketCategories: Reducer<MarketCategoriesSliceState>;
};

export const reducer: TalonReducer = {
  auth: authSlice,
  logs: auditLogsSlice,
  users: usersSlice,
  usersDetails: usersDetailsSlice,
  marketsDetails: marketsDetailsSlice,
  marketCategories: marketCategoriesSlice,
};

export const middleware = [];

export const enhancers = [];
