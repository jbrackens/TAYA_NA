import React, { useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { openDialog } from "../../dialogs";
import {
  fetchBonuses,
  fetchCountries,
  fetchGameManufacturers,
  fetchGameProfiles,
  fetchGames,
  fetchPaymentMethods,
  fetchPaymentProviders,
  fetchPromotions,
  fetchRisks,
  getBonuses,
  getCountries,
  getGameManufacturers,
  getGameProfiles,
  getGames,
  getIsLoadingProviders,
  getPaymentMethodProviders,
  getPaymentMethods,
  getPromotions,
  getRisks,
  getSettingsLoading,
} from "./settingsSlice";
import Component from "./Component";
import { Bonus, CountrySettings, GameSettings, PaymentProvider, Risk } from "app/types";

const Container = () => {
  const dispatch = useDispatch();
  const { type = "countries", brandId = "all", paymentMethodId } = useParams();
  const navigate = useNavigate();
  const isLoading = useSelector(getSettingsLoading);
  const countries = useSelector(getCountries);
  const games = useSelector(getGames);
  const gameManufacturers = useSelector(getGameManufacturers);
  const bonuses = useSelector(getBonuses);
  const paymentMethods = useSelector(getPaymentMethods);
  const promotions = useSelector(getPromotions);
  const gameProfiles = useSelector(getGameProfiles);
  const risks = useSelector(getRisks);
  const paymentMethodProviders = useSelector(getPaymentMethodProviders);
  const isLoadingProviders = useSelector(getIsLoadingProviders);

  const fetchData = useCallback(
    (type: string, brandId: string) => {
      switch (type) {
        case "countries":
          return dispatch(fetchCountries({ brandId }));
        case "games":
          return dispatch(fetchGames());
        case "game-manufacturers":
          return dispatch(fetchGameManufacturers());
        case "bonuses":
          return dispatch(fetchBonuses({ brandId }));
        case "payment-methods":
          return dispatch(fetchPaymentMethods());
        case "promotions":
          dispatch(fetchGames());
          return dispatch(fetchPromotions({ brandId }));
        case "game-profiles":
          return dispatch(fetchGameProfiles({ brandId }));
        case "risks":
          return dispatch(fetchRisks({}));
        default:
          return null;
      }
    },
    [dispatch],
  );

  useEffect(() => {
    fetchData(type, brandId);
  }, [fetchData, type, brandId]);

  useEffect(() => {
    if (paymentMethodId) {
      dispatch(fetchPaymentProviders({ paymentMethodId: Number(paymentMethodId) }));
    }
  }, [dispatch, paymentMethodId]);

  const handleTypeChange = useCallback(
    (type: string) => {
      if (type === "countries" || type === "bonuses") {
        return navigate(`/settings/${type}/${brandId}`);
      }

      navigate(`/settings/${type}`);
    },
    [brandId, navigate],
  );

  const handleBrandIdChange = useCallback(
    (brandId: string) => navigate(`/settings/${type}/${brandId}`),
    [type, navigate],
  );

  const handleEditSetting = useCallback(
    (setting: any, settingNameKey: string, dialogName: string) =>
      dispatch(openDialog(dialogName, { [settingNameKey]: setting, brandId })),
    [dispatch, brandId],
  );

  const handleArchive = useCallback(
    (id: number, settingsType: string) => dispatch(openDialog("confirm-archivation", { id, brandId, settingsType })),
    [dispatch, brandId],
  );

  const handleEditCountry = useCallback(
    (country: CountrySettings) => dispatch(openDialog("edit-country", country)),
    [dispatch],
  );
  const handleEditGame = useCallback((game: GameSettings) => dispatch(openDialog("edit-game", game)), [dispatch]);
  const handleEditGameManufacturer = useCallback(
    (gameManufacturerId: string) => dispatch(openDialog("edit-game-manufacturer", gameManufacturerId)),
    [dispatch],
  );
  const handleEditBonus = useCallback((bonus: Bonus) => dispatch(openDialog("bonus", { bonus })), [dispatch]);
  const handleEditPaymentMethod = useCallback(
    ({ id }: { id: number }) => {
      navigate(`/settings/${type}/${brandId}/${id}`);
    },
    [brandId, navigate, type],
  );
  const handleAddGame = useCallback(() => dispatch(openDialog("create-game")), [dispatch]);
  const handleAddBonus = useCallback((brandId: string) => dispatch(openDialog("bonus", { brandId })), [dispatch]);
  const handleAddPromotion = useCallback(
    (brandId: string) => dispatch(openDialog("create-promotion", { brandId })),
    [dispatch],
  );
  const handleAddGameProfile = useCallback(
    (brandId: string) => dispatch(openDialog("create-game-profile", { brandId })),
    [dispatch],
  );
  const handleAddRisk = useCallback(() => dispatch(openDialog("add-risk")), [dispatch]);
  const handleEditRisk = useCallback((risk: Risk) => dispatch(openDialog("edit-risk", risk)), [dispatch]);
  const handleGoBack = useCallback(() => {
    navigate(`/settings/${type}/${brandId}`);
    fetchData(type, brandId);
  }, [brandId, fetchData, navigate, type]);
  const handleOpenDetails = useCallback(
    (paymentProvider: PaymentProvider) => dispatch(openDialog("payment-provider-details", { paymentProvider })),
    [dispatch],
  );

  return (
    <Component
      isLoading={isLoading}
      type={type}
      brandId={brandId}
      countries={countries}
      games={games}
      gameManufacturers={gameManufacturers}
      bonuses={bonuses}
      paymentMethods={paymentMethods}
      paymentMethodId={paymentMethodId!}
      paymentMethodProviders={paymentMethodProviders}
      onOpenDetails={handleOpenDetails}
      isLoadingProviders={isLoadingProviders}
      promotions={promotions}
      gameProfiles={gameProfiles}
      risks={risks}
      onTypeChange={handleTypeChange}
      onBrandIdChange={handleBrandIdChange}
      onEditCountry={handleEditCountry}
      onEditGame={handleEditGame}
      onEditGameManufacturer={handleEditGameManufacturer}
      onEditPromotion={handleEditSetting}
      onEditBonus={handleEditBonus}
      onEditPaymentMethod={handleEditPaymentMethod}
      onEditGameProfile={handleEditSetting}
      onAddGame={handleAddGame}
      onAddBonus={handleAddBonus}
      onAddPromotion={handleAddPromotion}
      onAddGameProfile={handleAddGameProfile}
      onAddRisk={handleAddRisk}
      onEditRisk={handleEditRisk}
      onArchive={handleArchive}
      onGoBack={handleGoBack}
    />
  );
};

export default Container;
