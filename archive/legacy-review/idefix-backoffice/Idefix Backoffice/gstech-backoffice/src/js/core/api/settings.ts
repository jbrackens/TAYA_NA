import { FetchApi, SettingsAPI } from "./types";
import { PREFIX } from "./";

export default (fetchApi: FetchApi): SettingsAPI => ({
  load: () => fetchApi(`${PREFIX}/settings`),
  getBrandCountries: brandId => fetchApi(`${PREFIX}/countries/${brandId}`),
  getCountries: () => fetchApi(`${PREFIX}/countries`),
  updateCountry: (brandId, countryId, countryDraft) =>
    fetchApi(`${PREFIX}/countries/${brandId}/${countryId}`, {
      method: "put",
      body: JSON.stringify(countryDraft),
    }),
  getGames: () => fetchApi(`${PREFIX}/games`),
  createGame: (gameDraft, profileDrafts) =>
    fetchApi(`${PREFIX}/games`, {
      method: "post",
      body: JSON.stringify({ gameDraft, profileDrafts }),
    }),
  updateGame: (gameId, gameDraft) =>
    fetchApi(`${PREFIX}/games/${gameId}`, {
      method: "put",
      body: JSON.stringify(gameDraft),
    }),
  getGameProfiles: gameId => fetchApi(`${PREFIX}/games/${gameId}/profiles`),
  getAvailableGameProfiles: () => fetchApi(`${PREFIX}/games/profiles`),
  updateProfiles: (gameId, profileDrafts) =>
    fetchApi(`${PREFIX}/games/${gameId}/profiles`, {
      method: "put",
      body: JSON.stringify(profileDrafts),
    }),
  getGameManufacturers: () => fetchApi(`${PREFIX}/game-manufacturers`),
  getGameManufacturer: gameManufacturerId => fetchApi(`${PREFIX}/game-manufacturers/${gameManufacturerId}`),
  updateGameManufacturer: (gameManufacturerId, manufacturerDraft) =>
    fetchApi(`${PREFIX}/game-manufacturers/${gameManufacturerId}`, {
      method: "put",
      body: JSON.stringify(manufacturerDraft),
    }),
  getBonuses: brandId => fetchApi(`${PREFIX}/bonuses/${brandId}`),
  updateBonus: (bonusId, bonusDraft) =>
    fetchApi(`${PREFIX}/bonuses/${bonusId}`, {
      method: "put",
      body: JSON.stringify(bonusDraft),
    }),
  createBonus: (brandId, bonusDraft) =>
    fetchApi(`${PREFIX}/bonuses`, {
      method: "post",
      body: JSON.stringify({
        brandId,
        ...bonusDraft,
      }),
    }),
  getBonusLimits: bonusId => fetchApi(`${PREFIX}/bonuses/${bonusId}/limits`),
  getAvailableBonusLimits: brandId => fetchApi(`${PREFIX}/brands/${brandId}/limits`),
  updateBonusLimits: (bonusId, bonusLimitDrafts) =>
    fetchApi(`${PREFIX}/bonuses/${bonusId}/limits`, {
      method: "put",
      body: JSON.stringify(bonusLimitDrafts),
    }),
  getPaymentMethods: () => fetchApi(`${PREFIX}/settings/payment-methods`),
  getPaymentProviders: paymentMethodId => fetchApi(`${PREFIX}/settings/payment-methods/${paymentMethodId}`),
  updatePaymentProviders: (paymentMethodId, values) =>
    fetchApi(`${PREFIX}/settings/payment-methods/${paymentMethodId}`, {
      method: "put",
      body: JSON.stringify(values),
    }),
  getPaymentProviderDetails: paymentProviderId => fetchApi(`${PREFIX}/settings/payment-providers/${paymentProviderId}`),
  updatePaymentProviderDetails: (paymentProviderId, values) =>
    fetchApi(`${PREFIX}/settings/payment-providers/${paymentProviderId}`, {
      method: "put",
      body: JSON.stringify(values),
    }),
  getPromotions: brandId => fetchApi(`${PREFIX}/promotions/${brandId}`),
  createPromotion: promotionDraft =>
    fetchApi(`${PREFIX}/promotions`, {
      method: "post",
      body: JSON.stringify(promotionDraft),
    }),
  updatePromotion: (promotionId, promotionDraft) =>
    fetchApi(`${PREFIX}/promotions/${promotionId}`, {
      method: "put",
      body: JSON.stringify(promotionDraft),
    }),
  getGameProfileSettings: brandId => fetchApi(`${PREFIX}/game-profiles/${brandId}`),
  createGameProfile: gameProfileDraft =>
    fetchApi(`${PREFIX}/game-profiles`, {
      method: "post",
      body: JSON.stringify(gameProfileDraft),
    }),
  updateGameProfile: (gameProfileId, gameProfileDraft) =>
    fetchApi(`${PREFIX}/game-profiles/${gameProfileId}`, {
      method: "put",
      body: JSON.stringify(gameProfileDraft),
    }),
  getCurrencies: brandId => fetchApi(`${PREFIX}/campaigns/currencies/${brandId}`),
  archiveBonus: bonusId =>
    fetchApi(`${PREFIX}/bonuses/${bonusId}/archive`, {
      method: "put",
    }),
  archivePromotion: promotionId =>
    fetchApi(`${PREFIX}/promotions/${promotionId}/archive`, {
      method: "put",
    }),
  addPromotionGames: (promotionId, games) =>
    fetchApi(`${PREFIX}/promotion-games`, {
      method: "post",
      body: JSON.stringify({ promotionId, games }),
    }),
  getPromotionGames: promotionId => fetchApi(`${PREFIX}/promotion-games/${promotionId}`),
  updatePromotionGames: (promotionId, games) =>
    fetchApi(`${PREFIX}/promotion-games/${promotionId}`, {
      method: "put",
      body: JSON.stringify({ games }),
    }),
  getRisks: params =>
    fetchApi(`${PREFIX}/risks`, {
      params,
    }),
  addRisk: riskDraft =>
    fetchApi(`${PREFIX}/risks`, {
      method: "post",
      body: JSON.stringify(riskDraft),
    }),
  updateRisk: (riskId, riskDraft) =>
    fetchApi(`${PREFIX}/risks/${riskId}`, {
      method: "put",
      body: JSON.stringify(riskDraft),
    }),
});
