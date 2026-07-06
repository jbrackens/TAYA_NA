'use client';
import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from './store';

interface AuthState {
  isLoginModalVisible: boolean;
  isRegisterModalVisible: boolean;
  isForgotPasswordModalVisible: boolean;
  isLoggedIn: boolean;
  isWsErrorModalVisible: boolean;
  isTermsModalVisible: boolean;
  isResetPasswordModalVisible: boolean;
  isWsConnected: boolean;
}

const initialState: AuthState = {
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
  name: 'auth',
  initialState,
  reducers: {
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
      state.isLoginModalVisible = false;
    },
    logOut: (state) => {
      state.isLoggedIn = false;
    },
    logOutAndShowLoginModal: (state) => {
      state.isLoggedIn = false;
      state.isLoginModalVisible = true;
    },
    onSucceededLogin: (state) => {
      state.isLoggedIn = true;
      state.isLoginModalVisible = false;
      state.isRegisterModalVisible = false;
    },
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

// Selectors
export const selectAuthModalVisible = (state: RootState) => state.auth.isLoginModalVisible;
export const selectRegisterModalVisible = (state: RootState) => state.auth.isRegisterModalVisible;
export const selectForgotPasswordModalVisible = (state: RootState) => state.auth.isForgotPasswordModalVisible;
export const selectResetPasswordModalVisible = (state: RootState) => state.auth.isResetPasswordModalVisible;
export const selectTermsModalVisible = (state: RootState) => state.auth.isTermsModalVisible;
export const selectIsLoggedIn = (state: RootState) => state.auth.isLoggedIn;
export const selectWsErrorModalVisible = (state: RootState) => state.auth.isWsErrorModalVisible;
export const selectIsWsConnected = (state: RootState) => state.auth.isWsConnected;

export default authSlice.reducer;
