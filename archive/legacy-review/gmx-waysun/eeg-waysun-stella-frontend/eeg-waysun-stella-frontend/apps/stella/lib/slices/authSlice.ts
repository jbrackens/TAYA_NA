import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  isLoggedIn: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logIn: (state) => {
      state.isLoggedIn = true;
    },
    logOut: (state) => {
      state.isLoggedIn = false;
    },
  },
});

export const selectIsLoggedIn = (state: any) => state.auth.isLoggedIn;

export const { logIn, logOut } = authSlice.actions;

export default authSlice.reducer;
