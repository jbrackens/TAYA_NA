import { Reducer } from "@reduxjs/toolkit";
import usersSlice from "./lib/slices/usersSlice";
import authSlice from "./lib/slices/authSlice";
import usersDetailsSlice, {
  UsersDetailsSliceState,
} from "./lib/slices/usersDetailsSlice";
import marketsSlice, { MarketsSliceState } from "./lib/slices/marketsSlice";
import fixturesSlice, { FixturesSliceState } from "./lib/slices/fixturesSlice";
import { UsersSliceState } from "./lib/slices/usersSlice";
import auditLogsSlice, { AuditLogsSliceState } from "./lib/slices/logsSlice";
import fixturesDetailsSlice, {
  FixturesDetailsSliceState,
} from "./lib/slices/fixturesDetailsSlice";
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
  markets: Reducer<MarketsSliceState>;
  marketsDetails: Reducer<MarketsDetailsSliceState>;
  fixtures: Reducer<FixturesSliceState>;
  fixturesDetails: Reducer<FixturesDetailsSliceState>;
  marketCategories: Reducer<MarketCategoriesSliceState>;
};

export const reducer: TalonReducer = {
  auth: authSlice,
  logs: auditLogsSlice,
  users: usersSlice,
  usersDetails: usersDetailsSlice,
  markets: marketsSlice,
  marketsDetails: marketsDetailsSlice,
  fixtures: fixturesSlice,
  fixturesDetails: fixturesDetailsSlice,
  marketCategories: marketCategoriesSlice,
};

export const middleware = [];

export const enhancers = [];
