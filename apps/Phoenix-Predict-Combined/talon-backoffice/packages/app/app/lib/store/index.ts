// Store configuration
export { makeStore, type AppStore, type RootState, type AppDispatch } from './store';

// Store provider
export { default as StoreProvider } from './StoreProvider';

// Hooks
export { useAppDispatch, useAppSelector } from './hooks';

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
} from './authSlice';

// Settings slice
export {
  DisplayOddsEnum,
  LimitEnum,
  setUserData,
  updateUserData,
  setOddsFormat,
  setCurrentGame,
  setLanguage,
  setIsUserDataLoading,
  setIsGeocomplyRequired,
  setIsGeocomplyLocationFailed,
  setIsAccountDataUpdateNeeded,
  clearSettings,
  selectUserData,
  selectOddsFormat,
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
  selectDepositLimits,
  selectStakeLimits,
  selectSessionLimits,
  selectCommunicationPreferences,
  selectBettingPreferences,
  selectUserStatus,
  selectCoolOff,
  selectTerms,
  selectHasToAcceptTerms,
  selectSignUpDate,
  selectHasToAcceptResponsibilityCheck,
} from './settingsSlice';

// Navigation slice
export {
  LocationEnum,
  changeLocationToAccount,
  changeLocationToStandard,
  selectLocation,
} from './navigationSlice';

// Cashier slice
export {
  showCashierDrawer,
  hideCashierDrawer,
  setCurrentBalance,
  setBalanceUpdateNeeded,
  selectCashierDrawerVisible,
  selectCurrentBalance,
  selectIsBalanceUpdateNeeded,
} from './cashierSlice';

// Site settings slice
export {
  Currency,
  setMinAgeToRegister,
  setCurrency,
  setThresholdValue,
  setCountryCode,
  setMinWithdrawal,
  setMaxWithdrawal,
  setMinDeposit,
  setMaxDeposit,
  setMinStake,
  setMaxStake,
  setMfaToggleVisibility,
  selectMinAgeToRegister,
  selectCurrency,
  selectThresholdValue,
  selectCountryCode,
  selectMinWithdrawal,
  selectMaxWithdrawal,
  selectMinDeposit,
  selectMaxDeposit,
  selectMinStake,
  selectMaxStake,
  selectMfaToggleVisibility,
} from './siteSettingsSlice';

// Channel subscription slice
export {
  addSubscription,
  removeSubscription,
  cleanupSubscription,
  addMessageToQueue,
  removeMessageFromQueue,
  selectSubscriptions,
  selectMessageQueue,
} from './channelSubscriptionSlice';

// Profile slice
export {
  increment as profileIncrement,
  reset as profileReset,
  setValue as profileSetValue,
  selectProfileValue,
} from './profileSlice';

// Prediction slice
export {
  selectPredictionOutcome,
  clearPredictionSelection,
  setPredictionStake,
  markPredictionMarketVisited,
  selectPredictionSelection,
  selectPredictionStake,
  selectPredictionRecentMarketIds,
} from './predictionSlice';
export type { PredictionSelection } from './predictionSlice';
