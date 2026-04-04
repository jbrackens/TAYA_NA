import { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAppDispatch, settingsSlice, dialogsSlice, useAppSelector, appSlice } from "@idefix-backoffice/idefix/store";
import { Bonus, CountrySettings, DIALOG, GameSettings, PaymentProvider, Risk } from "@idefix-backoffice/idefix/types";

export const useSettings = () => {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(settingsSlice.getSettingsLoading);
  const countries = useAppSelector(settingsSlice.getCountries);
  const games = useAppSelector(settingsSlice.getGames);
  const gameManufacturers = useAppSelector(settingsSlice.getGameManufacturers);
  const bonuses = useAppSelector(settingsSlice.getBonuses);
  const paymentMethods = useAppSelector(settingsSlice.getPaymentMethods);
  const promotions = useAppSelector(settingsSlice.getPromotions);
  const gameProfiles = useAppSelector(settingsSlice.getGameProfiles);
  const risks = useAppSelector(settingsSlice.getRisks);
  const paymentMethodProviders = useAppSelector(settingsSlice.getPaymentMethodProviders);
  const isLoadingProviders = useAppSelector(settingsSlice.getIsLoadingProviders);
  const brands = useAppSelector(appSlice.getBrands);
  const navigate = useNavigate();
  const {
    type = "countries",
    brandId = "all",
    paymentMethodId
  } = useParams<{ type: string; brandId: string; paymentMethodId: string }>();

  const fetchData = useCallback(
    (type: string, brandId: string) => {
      switch (type) {
        case "countries":
          return dispatch(settingsSlice.fetchCountries({ brandId }));
        case "games":
          return dispatch(settingsSlice.fetchGames());
        case "game-manufacturers":
          return dispatch(settingsSlice.fetchGameManufacturers());
        case "bonuses":
          return dispatch(settingsSlice.fetchBonuses({ brandId }));
        case "payment-methods":
          return dispatch(settingsSlice.fetchPaymentMethods());
        case "promotions":
          dispatch(settingsSlice.fetchGames());
          return dispatch(settingsSlice.fetchPromotions({ brandId }));
        case "game-profiles":
          return dispatch(settingsSlice.fetchGameProfiles({ brandId }));
        case "risks":
          return dispatch(settingsSlice.fetchRisks({}));
        default:
          return null;
      }
    },
    [dispatch]
  );

  const handleChangeType = useCallback(
    (type: string) => {
      if (["countries", "bonuses"].includes(type)) {
        return navigate(`/settings/${type}/${brandId}`);
      }
      navigate(`/settings/${type}`);
    },
    [brandId, navigate]
  );

  const handleBrandChange = useCallback(
    (brandId: string) => {
      navigate(`/settings/${type}/${brandId}`);
    },
    [navigate, type]
  );

  const handleEditSetting = useCallback(
    (setting: any, settingNameKey: string, dialogName: string) =>
      dispatch(dialogsSlice.openDialog(dialogName, { [settingNameKey]: setting, brandId })),
    [dispatch, brandId]
  );

  const handleArchive = useCallback(
    (id: number, settingsType: string) =>
      dispatch(dialogsSlice.openDialog(DIALOG.CONFIRM_ARCHIVATION_BONUS, { id, brandId, settingsType })),
    [dispatch, brandId]
  );

  const handleEditCountry = useCallback(
    (country: CountrySettings) => dispatch(dialogsSlice.openDialog(DIALOG.EDIT_COUNTRY, country)),
    [dispatch]
  );

  const handleEditGame = useCallback(
    (game: GameSettings) => dispatch(dialogsSlice.openDialog(DIALOG.EDIT_GAME, game)),
    [dispatch]
  );

  const handleEditGameManufacturer = useCallback(
    (gameManufacturerId: string) =>
      dispatch(dialogsSlice.openDialog(DIALOG.EDIT_GAME_MANUFACTURER, gameManufacturerId)),
    [dispatch]
  );

  const handleEditBonus = useCallback(
    (bonus: Bonus) => dispatch(dialogsSlice.openDialog(DIALOG.BONUS, { bonus })),
    [dispatch]
  );

  const handleEditPaymentMethod = useCallback(
    ({ id }: { id: number }) => {
      navigate(`/settings/${type}/${brandId}/${id}`);
    },
    [brandId, navigate, type]
  );

  const handleAddAction = useCallback(
    (type: string, brandId: string) => {
      switch (type) {
        case "games":
          dispatch(dialogsSlice.openDialog(DIALOG.CREATE_GAME));
          break;
        case "bonuses":
          dispatch(dialogsSlice.openDialog(DIALOG.BONUS, { brandId }));
          break;
        case "promotions":
          dispatch(dialogsSlice.openDialog(DIALOG.CREATE_PROMOTION, { brandId }));
          break;
        case "game-profiles":
          dispatch(dialogsSlice.openDialog(DIALOG.CREATE_GAME_PROFILE, { brandId }));
          break;
        case "risks":
          dispatch(dialogsSlice.openDialog(DIALOG.ADD_RISK));
          break;
        default:
          return;
      }
    },
    [dispatch]
  );

  const handleEditRisk = useCallback(
    (risk: Risk) => dispatch(dialogsSlice.openDialog(DIALOG.EDIT_RISK, risk)),
    [dispatch]
  );

  const handleGoBack = useCallback(() => {
    navigate(`/settings/${type}/${brandId}`);
    fetchData(type, brandId);
  }, [brandId, fetchData, navigate, type]);

  const handleOpenDetails = useCallback(
    (paymentProvider: PaymentProvider) =>
      dispatch(dialogsSlice.openDialog(DIALOG.PAYMENT_PROVIDER_DETAILS, { paymentProvider })),
    [dispatch]
  );

  useEffect(() => {
    fetchData(type, brandId);
  }, [brandId, fetchData, type]);

  useEffect(() => {
    if (paymentMethodId) {
      dispatch(settingsSlice.fetchPaymentProviders({ paymentMethodId: Number(paymentMethodId) }));
    }
  }, [dispatch, paymentMethodId]);

  return {
    data: {
      type,
      brandId,
      brands,
      paymentMethodId,
      isLoading,
      countries,
      games,
      gameManufacturers,
      bonuses,
      paymentMethods,
      promotions,
      gameProfiles,
      risks,
      paymentMethodProviders,
      isLoadingProviders
    },
    handlers: {
      handleChangeType,
      handleBrandChange,
      handleEditSetting,
      handleArchive,
      handleEditCountry,
      handleEditGame,
      handleEditGameManufacturer,
      handleEditBonus,
      handleEditPaymentMethod,
      handleAddAction,
      handleEditRisk,
      handleGoBack,
      handleOpenDetails
    }
  };
};
