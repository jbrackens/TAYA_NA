import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "app/types";
import api from "../../core/api";
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
    inactive: false,
  },
  error: false,
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
        [payload.key]: payload.value,
      };
    },
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
  },
});

export const {
  reducer,
  actions: { toggleFilter },
} = usersSidebarSlice;

const getUsersSidebar = (state: RootState) => state.usersSidebar;
const getUsers = (state: RootState) => state.usersSidebar.users;

export const getUsersSidebarState = createSelector(getUsersSidebar, getUsers, (usersSidebar, users) => {
  if (!usersSidebar.filters.inactive) {
    const filteredUsers = users.filter(user => !user.accountClosed);
    return {
      ...usersSidebar,
      users: filteredUsers,
    };
  }

  return {
    ...usersSidebar,
    users,
  };
});
