import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { User } from "@idefix-backoffice/idefix/types";
import api from "@idefix-backoffice/idefix/api";

import { RootState } from "../../rootReducer";

export interface UsersSidebarState {
  isFetching: boolean;
  users: User[];
  selectedBrand?: string;
  filters: {
    inactive: boolean;
  };
  error: boolean;
}

export const initialState: UsersSidebarState = {
  isFetching: false,
  users: [],
  filters: {
    inactive: false
  },
  error: false
};

export const fetchUsers = createAsyncThunk<User[]>("users-sidebar/fetch-users", async (_, { rejectWithValue }) => {
  try {
    return await api.users.get();
  } catch (e) {
    return rejectWithValue(e);
  }
});

const usersSidebarSlice = createSlice({
  name: "users-sidebar",
  initialState,
  reducers: {
    toggleFilter(state, action: PayloadAction<{ key: string; value: boolean }>) {
      const { payload } = action;
      state.filters = {
        ...state.filters,
        [payload.key]: payload.value
      };
    }
  },
  extraReducers: builder => {
    builder.addCase(fetchUsers.pending, state => {
      state.isFetching = true;
    });
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      const { payload } = action;
      state.isFetching = false;
      state.users = payload;
    });
  }
});

export const {
  reducer,
  actions: { toggleFilter }
} = usersSidebarSlice;

const getState = (state: RootState) => state.usersSidebar;

export const getUsers = createSelector(getState, state => {
  if (!state.filters.inactive) {
    const filteredUsers = state.users.filter(user => !user.accountClosed);
    return filteredUsers;
  }
  return state.users;
});

export const getIsLoading = createSelector(getState, state => state.isFetching);

export const getFilters = createSelector(getState, state => state.filters);
