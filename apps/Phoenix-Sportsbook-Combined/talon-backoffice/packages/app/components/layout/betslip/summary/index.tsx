import React from "react";
import { useTranslation } from "i18n";
import {
  SummaryContainer,
  SummaryRow,
  SummaryAmount,
  SummaryButtonContainer,
  // PlaceBetButton,
  DimmedLabel,
  CurrencyContainer,
  PossibleReturnValue,
  ClearBetslip,
  DimmedAcceptOddsLabel,
  SummaryRowBold,
  InlineCoreButton,
} from "../index.styled";
import { useCurrency } from "../../../../services/currency";
import { useDispatch, useSelector } from "react-redux";
// import {
//   showAuthModal,
//   selectIsWsConnected,
//   showWsErrorModal,
//   selectIsLoggedIn,
// } from "../../../../lib/slices/authSlice";
import { SecondaryTabs } from "..";
import {
  selectMultiBetsStake,
  resetBetslipState,
  // setShouldScrollToErrorElement,
  // setIsErrorVisible,
  selectSingleBets,
  // selectIsConfirmationComponentVisible,
  // setIsOddsChangesConfirmed,
  // setIsConfirmationComponentVisible,
} from "../../../../lib/slices/betSlice";
import { useState } from "react";
import { Popover } from "antd";
import { CoreForm } from "../../../ui/form";
import { ResultModalComponent } from "../../../modals/result-modal";
import { StatusEnum } from "../../../results";
// import {
//   selectMaxStake,
//   selectMinStake,
// } from "../../../../lib/slices/siteSettingsSlice";
import { CoreSwitch } from "../../../ui/switch";

type BetslipSummaryProps = {
  summaryValues: {
    totalOdds?: string | number;
    totalStake?: string | number;
    possibleReturn?: string | number;
    multiBetsPossibleReturn?: string | number;
    betValues?: Record<string, { bet: number }>;
  };
  setReadyForSendSingleBets: (isReady: boolean) => void;
  setReadyForSendMultiBets: (isReady: boolean) => void;
  selectedTab: SecondaryTabs;
  setAcceptBetterOddsValue: (val: boolean) => void;
  acceptBetterOddsValue: boolean;
  resetBetslipItemsStatus: () => void;
};

const BetslipSummary: React.FC<BetslipSummaryProps> = ({
  summaryValues,
  // setReadyForSendSingleBets,
  // setReadyForSendMultiBets,
  selectedTab,
  acceptBetterOddsValue,
  setAcceptBetterOddsValue,
  // resetBetslipItemsStatus,
}) => {
  const { t } = useTranslation("betslip");
  const [isPopOverVisible, setIsPopOverVisible] = useState(false);
  const dispatch = useDispatch();
  const { getCurrency } = useCurrency();
  const mulitBetsStake = useSelector(selectMultiBetsStake);
  // const isWsConnectionOpen = useSelector(selectIsWsConnected);
  const data = useSelector(selectSingleBets);
  // const isConfirmationComponentVisible = useSelector(
  //   selectIsConfirmationComponentVisible,
  // );
  // const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const [
    isClearConfirmationModalVisible,
    setIsClearConfirmationModalVisible,
  ] = useState(false);

  // const maxStake = useSelector(selectMaxStake);
  // const minStake = useSelector(selectMinStake);

  // const checkIfAllbetsHaveStake = (): boolean => {
  //   const result = data.reduce(
  //     (i, j) =>
  //       i &&
  //       j.betslipId in summaryValues.betValues &&
  //       summaryValues.betValues[j.betslipId]?.bet >= minStake &&
  //       summaryValues.betValues[j.betslipId]?.bet <= maxStake &&
  //       summaryValues.betValues[j.betslipId]?.bet !== null,
  //     true,
  //   );
  //   return result;
  // };

  const checkIfBetsAreInLoadingState = (): boolean =>
    data.some((bet) => bet.status === "loading");

  // const setIsReadyToSendBets = () =>
  //   selectedTab === SecondaryTabs.SINGLE
  //     ? setReadyForSendSingleBets(true)
  //     : setReadyForSendMultiBets(true);

  // const placeABet = () => {
  //   dispatch(setShouldScrollToErrorElement(true));
  //   if (!isWsConnectionOpen) {
  //     dispatch(showWsErrorModal());
  //     return;
  //   }

  //   if (isConfirmationComponentVisible) {
  //     dispatch(setIsConfirmationComponentVisible(false));
  //     dispatch(setIsOddsChangesConfirmed(true));
  //     resetBetslipItemsStatus();
  //     dispatch(setIsErrorVisible(false));
  //     return;
  //   }

  //   if (isUserLoggedIn) {
  //     checkIfAllbetsHaveStake()
  //       ? setIsReadyToSendBets()
  //       : dispatch(setIsErrorVisible(true));
  //   } else {
  //     dispatch(showAuthModal());
  //   }
  // };

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
        <InlineCoreButton danger onClick={() => setIsPopOverVisible(false)}>
          {t("No")}
        </InlineCoreButton>
      </span>
      <span>
        <InlineCoreButton onClick={() => clearBetslip()} type="primary">
          {t("Yes")}
        </InlineCoreButton>
      </span>
    </div>
  );

  return (
    <>
      <SummaryContainer>
        {selectedTab === SecondaryTabs.MUTLI && (
          <SummaryRow>
            <DimmedLabel>{t("TOTAL_ODDS")}</DimmedLabel>
            <SummaryAmount>{summaryValues.totalOdds}</SummaryAmount>
          </SummaryRow>
        )}
        <SummaryRow>
          <DimmedLabel>{t("TOTAL_STAKE")}</DimmedLabel>
          <SummaryAmount>
            <CurrencyContainer>{getCurrency()}</CurrencyContainer>
            <span role="stake-amount">
              {selectedTab === SecondaryTabs.SINGLE
                ? summaryValues.totalStake
                : mulitBetsStake}
            </span>
          </SummaryAmount>
        </SummaryRow>
        <SummaryRowBold>
          <span>{t("POSSIBLE_RETURN")}</span>
          <PossibleReturnValue role="possible-return">
            <CurrencyContainer>{getCurrency()}</CurrencyContainer>
            {selectedTab === SecondaryTabs.SINGLE
              ? summaryValues.possibleReturn
              : summaryValues.multiBetsPossibleReturn}
          </PossibleReturnValue>
        </SummaryRowBold>
        <SummaryButtonContainer>
          <SummaryRow>
            <DimmedAcceptOddsLabel>
              {t("ACCEPT_BET_ODDS")}
            </DimmedAcceptOddsLabel>
            <SummaryAmount>
              <CoreForm>
                <CoreSwitch
                  checked={acceptBetterOddsValue}
                  onChange={(checked) => setAcceptBetterOddsValue(checked)}
                />
              </CoreForm>
            </SummaryAmount>
          </SummaryRow>
          {/* hide place bet button due to vig.gg shut down */}
          {/* <PlaceBetButton
            type="primary"
            size="large"
            role="place_a_bet"
            onClick={() => placeABet()}
            loading={checkIfBetsAreInLoadingState()}
          >
            {isConfirmationComponentVisible && !checkIfBetsAreInLoadingState()
              ? t("ACCEPT_CHANGES")
              : isUserLoggedIn
              ? t("PLACE_BET")
              : t("LOG_IN_TO_BET")}
          </PlaceBetButton> */}
          <Popover
            content={popoverContent}
            arrowPointAtCenter
            visible={isPopOverVisible}
            //to be able to style it with styled components
            getPopupContainer={(trigger) => {
              return trigger;
            }}
          >
            <ClearBetslip onClick={onClearBetslipClick}>
              {t("CLEAR_BETSLIP")}
            </ClearBetslip>
          </Popover>
        </SummaryButtonContainer>
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
