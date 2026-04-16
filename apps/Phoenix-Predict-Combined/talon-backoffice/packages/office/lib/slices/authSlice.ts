import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  isRegisterModalVisible: false,
  isForgotPasswordModalVisible: false,
  shouldLogoutUser: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    showRegisterModal: (state) => {
      state.isRegisterModalVisible = true;
    },

    hideRegisterModal: (state) => {
      state.isRegisterModalVisible = false;
    },

    showForgotPasswordModal: (state) => {
      state.isForgotPasswordModalVisible = true;
    },

    hideForgotPasswordModal: (state) => {
      state.isForgotPasswordModalVisible = false;
    },

    shouldLogoutUser: (state) => {
      state.shouldLogoutUser = true;
    },

    shouldNotLogoutUser: (state) => {
      state.shouldLogoutUser = false;
    },
  },
});

export const selectRegisterModalVisible = (state: any) =>
  state.auth.isRegisterModalVisible;

export const selectForgotPasswordModalVisible = (state: any) =>
  state.auth.isForgotPasswordModalVisible;

export const selectShouldLogoutUser = (state: any) =>
  state.auth.shouldLogoutUser;

export const {
  showRegisterModal,
  hideRegisterModal,
  showForgotPasswordModal,
  hideForgotPasswordModal,
  shouldLogoutUser,
  shouldNotLogoutUser,
} = authSlice.actions;

export default authSlice.reducer;
