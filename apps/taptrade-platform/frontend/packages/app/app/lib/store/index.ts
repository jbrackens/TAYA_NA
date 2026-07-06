// Store configuration
export {
  makeStore,
  type AppStore,
  type RootState,
  type AppDispatch,
} from "./store";

// Store provider
export { default as StoreProvider } from "./StoreProvider";

// Hooks
export { useAppDispatch, useAppSelector } from "./hooks";

// Auth slice
export {
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
  selectAuthModalVisible,
  selectRegisterModalVisible,
  selectForgotPasswordModalVisible,
  selectResetPasswordModalVisible,
  selectTermsModalVisible,
  selectIsLoggedIn,
  selectWsErrorModalVisible,
  selectIsWsConnected,
} from "./authSlice";

// Settings slice
export {
  setUserData,
  updateUserData,
  setCurrentGame,
  setLanguage,
  setIsUserDataLoading,
  setIsGeocomplyRequired,
  setIsGeocomplyLocationFailed,
  setIsAccountDataUpdateNeeded,
  clearSettings,
  selectUserData,
  selectCurrentGame,
  selectLanguage,
  selectIsUserDataLoading,
  selectIsGeocomplyRequired,
  selectIsGeocomplyLocationFailed,
  selectIsAccountDataUpdateNeeded,
  selectUserPhoneNumber,
  selectUserId,
  selectUsername,
  selectUserEmail,
  selectUserName,
  selectUserAddress,
  selectUserDateOfBirth,
  selectSessionLimits,
  selectCommunicationPreferences,
  selectUserStatus,
  selectCoolOff,
  selectTerms,
  selectHasToAcceptTerms,
  selectSignUpDate,
  selectHasToAcceptResponsibilityCheck,
} from "./settingsSlice";

// Navigation slice
export {
  LocationEnum,
  changeLocationToAccount,
  changeLocationToStandard,
  selectLocation,
} from "./navigationSlice";

// Point balance slice
export {
  setCurrentBalance,
  setBalanceUpdateNeeded,
  selectCurrentBalance,
  selectIsBalanceUpdateNeeded,
} from "./pointBalanceSlice";

// Site settings slice
export {
  setMinAgeToRegister,
  setCountryCode,
  setMfaToggleVisibility,
  selectMinAgeToRegister,
  selectCountryCode,
  selectMfaToggleVisibility,
} from "./siteSettingsSlice";

// Channel subscription slice
export {
  addSubscription,
  removeSubscription,
  cleanupSubscription,
  addMessageToQueue,
  removeMessageFromQueue,
  selectSubscriptions,
  selectMessageQueue,
} from "./channelSubscriptionSlice";

// Profile slice
export {
  increment as profileIncrement,
  reset as profileReset,
  setValue as profileSetValue,
  selectProfileValue,
} from "./profileSlice";
