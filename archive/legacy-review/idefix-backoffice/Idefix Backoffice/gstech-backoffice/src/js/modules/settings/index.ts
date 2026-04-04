import SettingsContainer from "./Container";
import {
  fetchCountries as refetchCountries,
  fetchGames as refetchGames,
  fetchBonuses as refetchBonuses,
  fetchPaymentMethods as refetchPaymentMethods,
  fetchPromotions as refetchPromotions,
  fetchGameProfiles as refetchGameProfiles,
  fetchRisks as refetchRisks,
  reducer,
  getPaymentMethods,
} from "./settingsSlice";

export {
  SettingsContainer,
  refetchCountries,
  refetchGames,
  refetchBonuses,
  refetchPaymentMethods,
  refetchPromotions,
  refetchGameProfiles,
  refetchRisks,
  getPaymentMethods,
  reducer,
};
