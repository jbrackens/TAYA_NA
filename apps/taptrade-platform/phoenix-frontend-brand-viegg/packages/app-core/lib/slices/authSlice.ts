import { createSlice } from "@reduxjs/toolkit";

export const initialState = {
  isLoginModalVisible: false,
  isRegisterModalVisible: false,
  isForgotPasswordModalVisible: false,
  isLoggedIn: false,
  isWsErrorModalVisible: false,
  isTermsModalVisible: false,
  isResetPasswordModalVisible: false,
  isWsConnected: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Redux Toolkit allows us to write "mutating" logic in reducers. It
    // doesn't actually mutate the state because it uses the Immer library,
    // which detects changes to a "draft state" and produces a brand new
    // immutable state based off those changes
    showAuthModal: (state) => {
      state.isLoginModalVisible = true;
    },

    hideAuthModal: (state) => {
      state.isLoginModalVisible = false;
    },

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

    showResetPasswordModal: (state) => {
      state.isResetPasswordModalVisible = true;
    },

    hideResetPasswordModal: (state) => {
      state.isResetPasswordModalVisible = false;
    },

    logIn: (state) => {
      state.isLoggedIn = true;
    },

    logOut: (state) => {
      state.isLoggedIn = false;
    },

    logOutAndShowLoginModal: (state) => {
      state.isLoggedIn = false;
      state.isLoginModalVisible = true;
    },
    // for apiService onSucceded
    onSucceededLogin: () => {},

    showWsErrorModal: (state) => {
      state.isWsErrorModalVisible = true;
    },

    hideWsErrorModal: (state) => {
      state.isWsErrorModalVisible = false;
    },

    showTermsModal: (state) => {
      state.isTermsModalVisible = true;
    },

    hideTermsModal: (state) => {
      state.isTermsModalVisible = false;
    },

    setWsConnected: (state) => {
      state.isWsConnected = true;
    },

    setWsDisconnected: (state) => {
      state.isWsConnected = false;
    },
  },
});

export const selectAuthModalVisible = (state: any) =>
  state.auth.isLoginModalVisible;

export const selectRegisterModalVisible = (state: any) =>
  state.auth.isRegisterModalVisible;

export const selectForgotPasswordModalVisible = (state: any) =>
  state.auth.isForgotPasswordModalVisible;

export const selectResetPasswordModalVisible = (state: any) =>
  state.auth.isResetPasswordModalVisible;

export const selectTermsModalVisible = (state: any) =>
  state.auth.isTermsModalVisible;

export const selectIsLoggedIn = (state: any) => state.auth.isLoggedIn;

export const selectWsErrorModalVisible = (state: any) =>
  state.auth.isWsErrorModalVisible;

export const selectIsWsConnected = (state: any) => state.auth.isWsConnected;

export const {
  showAuthModal,
  hideAuthModal,
  showRegisterModal,
  hideRegisterModal,
  showForgotPasswordModal,
  hideForgotPasswordModal,
  showResetPasswordModal,
  hideResetPasswordModal,
  logIn,
  logOut,
  logOutAndShowLoginModal,
  onSucceededLogin,
  showWsErrorModal,
  hideWsErrorModal,
  showTermsModal,
  hideTermsModal,
  setWsConnected,
  setWsDisconnected,
} = authSlice.actions;

export default authSlice.reducer;
