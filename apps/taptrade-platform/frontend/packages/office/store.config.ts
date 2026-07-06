import { Reducer } from "@reduxjs/toolkit";
import usersSlice from "./lib/slices/usersSlice";
import authSlice from "./lib/slices/authSlice";
import usersDetailsSlice, {
  UsersDetailsSliceState,
} from "./lib/slices/usersDetailsSlice";
import { UsersSliceState } from "./lib/slices/usersSlice";
import auditLogsSlice, { AuditLogsSliceState } from "./lib/slices/logsSlice";

type OfficeReducer = {
  auth: Reducer<any>;
  logs: Reducer<AuditLogsSliceState>;
  users: Reducer<UsersSliceState>;
  usersDetails: Reducer<UsersDetailsSliceState>;
};

export const reducer: OfficeReducer = {
  auth: authSlice,
  logs: auditLogsSlice,
  users: usersSlice,
  usersDetails: usersDetailsSlice,
};

export const middleware = [];

export const enhancers = [];
