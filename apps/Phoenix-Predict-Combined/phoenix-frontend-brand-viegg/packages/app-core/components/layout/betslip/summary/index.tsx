import React from "react";
import { useTranslation } from "i18n";
import {
  SummaryContainer,
  SummaryActionsStack,
  SummaryMetricLabel,
  SummaryMetricRow,
  SummaryMetricValue,
  SummaryMetricValueAccent,
  SummaryPromoCard,
  SummaryPromoGroup,
  SummaryPromoHeader,
  SummaryPromoMeta,
  SummaryPromoTitle,
  SummarySection,
  SummaryStack,
  SummarySwitchRow,
  PlaceBetButton,
  CurrencyContainer,
  ClearBetslip,
  DimmedAcceptOddsLabel,
  SecondaryActionButton,
  SecondaryInlineActionButton,
} from "../index.styled";
import { useCurrency } from "../../../../services/currency";
import { useDispatch, useSelector } from "react-redux";
import {
  showAuthModal,
  selectIsWsConnected,
  showWsErrorModal,
  selectIsLoggedIn,
} from "../../../../lib/slices/authSlice";
import { SecondaryTabs } from "..";
import {
  selectMultiBetsStake,
  resetBetslipState,
  setShouldScrollToErrorElement,
  setIsErrorVisible,
  selectSingleBets,
  selectIsConfirmationComponentVisible,
  setIsOddsChangesConfirmed,
  setIsConfirmationComponentVisible,
} from "../../../../lib/slices/betSlice";
import { useState } from "react";
import { Popover } from "antd";
import { CoreForm } from "../../../ui/form";
import { ResultModalComponent } from "../../../modals/result-modal";
import { StatusEnum } from "../../../results";
import {
  selectMaxStake,
  selectMinStake,
} from "../../../../lib/slices/siteSettingsSlice";
import { CoreSwitch } from "../../../ui/switch";

type BetslipSummaryProps = {
  summaryValues: any;
  setReadyForSendSingleBets: (isReady: boolean) => void;
  setReadyForSendMultiBets: (isReady: boolean) => void;
  selectedTab: SecondaryTabs;
  setAcceptBetterOddsValue: (val: boolean) => void;
  acceptBetterOddsValue: boolean;
  resetBetslipItemsStatus: () => void;
  availableFreebetsCount?: number;
  availableOddsBoostCount?: number;
  appliedFreebetId?: string | null;
  appliedOddsBoostId?: string | null;
  toggleFreebet?: () => void;
  toggleOddsBoost?: () => void;
  isApplyingOddsBoost?: boolean;
};

const BetslipSummary: React.FC<BetslipSummaryProps> = ({
  summaryValues,
  setReadyForSendSingleBets,
  setReadyForSendMultiBets,
  selectedTab,
  acceptBetterOddsValue,
  setAcceptBetterOddsValue,
  resetBetslipItemsStatus,
  availableFreebetsCount = 0,
  availableOddsBoostCount = 0,
  appliedFreebetId = null,
  appliedOddsBoostId = null,
  toggleFreebet,
  toggleOddsBoost,
  isApplyingOddsBoost = false,
}) => {
  const { t } = useTranslation("betslip");
  const [isPopOverVisible, setIsPopOverVisible] = useState(false);
  const dispatch = useDispatch();
  const { getCurrency } = useCurrency();
  const mulitBetsStake = useSelector(selectMultiBetsStake);
  const isWsConnectionOpen = useSelector(selectIsWsConnected);
  const data = useSelector(selectSingleBets);
  const isConfirmationComponentVisible = useSelector(
    selectIsConfirmationComponentVisible,
  );
  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const [
    isClearConfirmationModalVisible,
    setIsClearConfirmationModalVisible,
  ] = useState(false);

  const maxStake = useSelector(selectMaxStake);
  const minStake = useSelector(selectMinStake);

  const checkIfAllbetsHaveStake = (): boolean => {
    const result = data.reduce(
      (i, j) =>
        i &&
        j.betslipId in summaryValues.betValues &&
        summaryValues.betValues[j.betslipId]?.bet >= minStake &&
        summaryValues.betValues[j.betslipId]?.bet <= maxStake &&
        summaryValues.betValues[j.betslipId]?.bet !== null,
      true,
    );
    return result;
  };

  const checkIfBetsAreInLoadingState = (): boolean =>
    data.some((bet) => bet.status === "loading");

  const setIsReadyToSendBets = () =>
    selectedTab === SecondaryTabs.SINGLE
      ? setReadyForSendSingleBets(true)
      : setReadyForSendMultiBets(true);

  const placeABet = () => {
    dispatch(setShouldScrollToErrorElement(true));
    if (!isWsConnectionOpen) {
      dispatch(showWsErrorModal());
      return;
    }

    if (isConfirmationComponentVisible) {
      dispatch(setIsConfirmationComponentVisible(false));
      dispatch(setIsOddsChangesConfirmed(true));
      resetBetslipItemsStatus();
      dispatch(setIsErrorVisible(false));
      return;
    }

    if (isUserLoggedIn) {
      checkIfAllbetsHaveStake()
        ? setIsReadyToSendBets()
        : dispatch(setIsErrorVisible(true));
    } else {
      dispatch(showAuthModal());
    }
  };

  const clearBetslip = () => {
    dispatch(resetBetslipState());
    setIsPopOverVisible(false);
  };

  const dispatchResetBetslipState = () => dispatch(resetBetslipState());

  const onClearBetslipClick = () => {
    if (checkIfBetsAreInLoadingState()) {
      setIsClearConfirmationModalVisible(true);
      return;
    }
    dispatchResetBetslipState();
  };

  const popoverContent = (
    <div>
      <p>{t("ARE_YOU_SURE")}</p>
      <span>
        <SecondaryInlineActionButton
          htmlType="button"
          onClick={() => setIsPopOverVisible(false)}
        >
          {t("No")}
        </SecondaryInlineActionButton>
      </span>
      <span>
        <SecondaryInlineActionButton htmlType="button" onClick={() => clearBetslip()}>
          {t("Yes")}
        </SecondaryInlineActionButton>
      </span>
    </div>
  );

  return (
    <>
      <SummaryContainer>
        <SummaryStack>
          <SummarySection>
            {selectedTab === SecondaryTabs.MUTLI && (
              <SummaryMetricRow>
                <SummaryMetricLabel>{t("TOTAL_ODDS")}</SummaryMetricLabel>
                <SummaryMetricValue>{summaryValues.totalOdds}</SummaryMetricValue>
              </SummaryMetricRow>
            )}
            <SummaryMetricRow>
              <SummaryMetricLabel>{t("TOTAL_STAKE")}</SummaryMetricLabel>
              <SummaryMetricValue>
                <CurrencyContainer>{getCurrency()}</CurrencyContainer>
                <span role="stake-amount">
                  {selectedTab === SecondaryTabs.SINGLE
                    ? summaryValues.totalStake
                    : mulitBetsStake}
                </span>
              </SummaryMetricValue>
            </SummaryMetricRow>
            <SummaryMetricRow>
              <SummaryMetricLabel>{t("POSSIBLE_RETURN")}</SummaryMetricLabel>
              <SummaryMetricValueAccent role="possible-return">
                <CurrencyContainer>{getCurrency()}</CurrencyContainer>
                {selectedTab === SecondaryTabs.SINGLE
                  ? summaryValues.possibleReturn
                  : summaryValues.multiBetsPossibleReturn}
              </SummaryMetricValueAccent>
            </SummaryMetricRow>
          </SummarySection>

          {(availableFreebetsCount > 0 || availableOddsBoostCount > 0) && (
            <SummarySection>
              <SummaryPromoGroup>
                {availableFreebetsCount > 0 ? (
                  <SummaryPromoCard>
                    <SummaryPromoHeader>
                      <SummaryPromoTitle>{t("AVAILABLE_FREEBETS")}</SummaryPromoTitle>
                      <SummaryPromoMeta role="available-freebets-count">
                        {availableFreebetsCount}
                      </SummaryPromoMeta>
                    </SummaryPromoHeader>
                    <SummaryMetricRow>
                      <SummaryMetricLabel>{t("APPLIED_FREEBET")}</SummaryMetricLabel>
                      <SummaryMetricValue role="applied-freebet-id">
                        {appliedFreebetId || "-"}
                      </SummaryMetricValue>
                    </SummaryMetricRow>
                    <SecondaryInlineActionButton
                      onClick={() => toggleFreebet?.()}
                      htmlType="button"
                    >
                      {appliedFreebetId ? t("REMOVE_FREEBET") : t("APPLY_FREEBET")}
                    </SecondaryInlineActionButton>
                  </SummaryPromoCard>
                ) : null}
                {availableOddsBoostCount > 0 ? (
                  <SummaryPromoCard>
                    <SummaryPromoHeader>
                      <SummaryPromoTitle>{t("AVAILABLE_ODDS_BOOSTS")}</SummaryPromoTitle>
                      <SummaryPromoMeta role="available-odds-boosts-count">
                        {availableOddsBoostCount}
                      </SummaryPromoMeta>
                    </SummaryPromoHeader>
                    <SummaryMetricRow>
                      <SummaryMetricLabel>{t("APPLIED_ODDS_BOOST")}</SummaryMetricLabel>
                      <SummaryMetricValue role="applied-odds-boost-id">
                        {appliedOddsBoostId || "-"}
                      </SummaryMetricValue>
                    </SummaryMetricRow>
                    <SecondaryInlineActionButton
                      onClick={() => toggleOddsBoost?.()}
                      htmlType="button"
                      disabled={isApplyingOddsBoost}
                    >
                      {isApplyingOddsBoost
                        ? t("APPLYING_ODDS_BOOST")
                        : appliedOddsBoostId
                        ? t("REMOVE_ODDS_BOOST")
                        : t("APPLY_ODDS_BOOST")}
                    </SecondaryInlineActionButton>
                  </SummaryPromoCard>
                ) : null}
              </SummaryPromoGroup>
            </SummarySection>
          )}

          <SummarySwitchRow>
            <DimmedAcceptOddsLabel>{t("ACCEPT_BET_ODDS")}</DimmedAcceptOddsLabel>
            <CoreForm>
              <CoreSwitch
                checked={acceptBetterOddsValue}
                onChange={(checked) => setAcceptBetterOddsValue(checked)}
              />
            </CoreForm>
          </SummarySwitchRow>

          <SummaryActionsStack>
          <PlaceBetButton
            type="primary"
            size="large"
            role="place_a_bet"
            onClick={() => placeABet()}
            loading={checkIfBetsAreInLoadingState()}
            disabled={
              (isUserLoggedIn && !checkIfAllbetsHaveStake()) ||
              checkIfBetsAreInLoadingState()
            }
          >
            {isConfirmationComponentVisible && !checkIfBetsAreInLoadingState()
              ? t("ACCEPT_CHANGES")
              : isUserLoggedIn
              ? t("PLACE_BET")
              : t("LOG_IN_TO_BET")}
          </PlaceBetButton>
          <Popover
            content={popoverContent}
            arrowPointAtCenter
            visible={isPopOverVisible}
            //to be able to style it with styled components
            getPopupContainer={(trigger) => {
              return trigger;
            }}
          >
            <SecondaryActionButton htmlType="button" onClick={onClearBetslipClick}>
              {t("CLEAR_BETSLIP")}
            </SecondaryActionButton>
          </Popover>
          <ClearBetslip onClick={onClearBetslipClick}>
            {t("CLEAR_BETSLIP")}
          </ClearBetslip>
          </SummaryActionsStack>
        </SummaryStack>
      </SummaryContainer>

      <ResultModalComponent
        status={StatusEnum.WARNING}
        title={t("CLEAR_CONFIRMATION_MODAL_TITLE")}
        subTitle={t("CLEAR_CONFIRMATION_MODAL_CONTENT")}
        okText={t("CLEAR_BETSLIP")}
        cancelText={t("CANCEL")}
        isVisible={isClearConfirmationModalVisible}
        onOk={dispatchResetBetslipState}
        onCancel={() => setIsClearConfirmationModalVisible(false)}
      />
    </>
  );
};
export { BetslipSummary };
