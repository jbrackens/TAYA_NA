import React, { useState, useEffect, useContext } from "react";
import { BetslipContainer, FakeBackground } from "./index.styled";
import { useDispatch, useSelector } from "react-redux";
import { useBets, Bet, Status, useSpy } from "@phoenix-ui/utils";
import {
  setBets as triggerSetBetsAction,
  selectBets,
  setSummaryValues as triggerSetSummaryValuesAction,
  selectSummaryValues,
  setTotalOddsValue,
  setErrorCodes,
  setIsErrorVisible,
  setSingleBets,
  setIsListErrorVisible,
} from "../../../lib/slices/betSlice";
import { useApi } from "../../../services/api/api-service";
import { BetSlipData } from "./list/index";
import { BetslipSummary } from "./summary";
import { MainTabsComponent } from "./main-tabs";
import {
  setIsGeocomplyLocationFailed,
  setIsGeocomplyRequired,
} from "../../../lib/slices/settingsSlice";
import GeolocationContext from "../../../components/api-wrapper/geocomply-context";
import { GeocomplyResultEnum } from "../../../services/geocomply";
import { handleBetUpdate } from "../../../services/websocket/channels-data-handler/utils";

type BetslipComponentProps = {
  setHeaderBetsCount?: (count: number) => void;
  closeBetSlip?: (e: React.MouseEvent) => void;
};

export type SummaryValues = {
  totalStake: number;
  possibleReturn: number;
  betValues: {
    [key: string]: {
      bet: number;
      toReturn: number;
    };
  };
  totalOdds: number;
  multiBetsPossibleReturn: number;
};

export enum SecondaryTabs {
  SINGLE = "SINGLE",
  MUTLI = "MULTI",
}

const PENDING_BETS_INTERVAL_TIME = 5000;
const PENDING_BETS_TIMEOUT_TIME = 5000;

const BetslipComponent: React.FC<BetslipComponentProps> = ({
  setHeaderBetsCount,
  closeBetSlip,
}) => {
  const geolocation = useContext(GeolocationContext);
  const { setBets, getBets, getSummaryValues, setSummaryValues } = useBets();
  const bets: Array<Bet> = useSelector(selectBets);
  const summaryValues: SummaryValues = useSelector(selectSummaryValues);
  const dispatch = useDispatch();
  const { triggerApi, data, error, resetHookState } = useApi(
    `punters/bets`,
    "POST",
  );
  const getStatusOfPendingBets = useApi("punters/bets/status", "POST");
  const [
    statusOfPendingBetsTimeout,
    setStatusOfPendingBetsTimeout,
  ] = useState<null | ReturnType<typeof setTimeout>>(null);
  const [
    statusOfPendingBetsInterval,
    setStatusOfPendingBetsInterval,
  ] = useState<null | ReturnType<typeof setInterval>>(null);

  const [mainTabs, setMainTabs] = useState(0);
  const [secondaryTabs, setSecondaryTabs] = useState(0);
  const [readyForSendSingleBets, setReadyForSendSingleBets] = useState(false);
  const [readyForSendMultiBets, setReadyForSendMultiBets] = useState(false);
  const [acceptBetterOddsValue, setAcceptBetterOddsValue] = useState(false);

  useEffect(() => {
    if (data) {
      dispatch(setIsErrorVisible(false));
      dispatch(setErrorCodes([]));
      const betsWithBetId = bets.map((el) => {
        const uuid = `${el.brandMarketId}-${el.selectionId}`;
        const elementToObserve = data.find(
          (dataEl: { marketId: string; selectionId: string; betId: string }) => `${dataEl.marketId}-${dataEl.selectionId}` === uuid,
        );
        if (elementToObserve !== undefined) {
          return {
            ...el,
            betId: elementToObserve.betId,
          };
        } else {
          return el;
        }
      });

      // if ws fails get status via http
      dispatch(triggerSetBetsAction(betsWithBetId));
      setStatusOfPendingBetsTimeout(
        setTimeout(() => {
          setStatusOfPendingBetsInterval(
            setInterval(() => {
              const pendingBetsIds = data.map((el: { betId: string }) => el.betId);
              getStatusOfPendingBets.triggerApi({
                betIds: pendingBetsIds,
              });
            }, PENDING_BETS_INTERVAL_TIME),
          );
        }, PENDING_BETS_TIMEOUT_TIME),
      );
    }
  }, [data]);

  useEffect(() => {
    if (getStatusOfPendingBets.data) {
      getStatusOfPendingBets.data.map((dataEl: Record<string, unknown>) => {
        handleBetUpdate(dataEl, dispatch);
      });
    }
  }, [getStatusOfPendingBets.data]);

  useEffect(() => {
    if (getStatusOfPendingBets.error) {
      if (statusOfPendingBetsInterval) {
        clearInterval(statusOfPendingBetsInterval);
        setStatusOfPendingBetsInterval(null);
      }

      if (statusOfPendingBetsTimeout) {
        clearTimeout(statusOfPendingBetsTimeout);
        setStatusOfPendingBetsTimeout(null);
      }
    }
  }, [getStatusOfPendingBets.error]);

  useEffect(() => {
    if (error !== undefined) {
      const dataWithProperStatus = bets.map((el) => ({
        ...el,
        status: undefined,
      }));
      dispatch(triggerSetBetsAction(dataWithProperStatus));
      dispatch(setIsListErrorVisible(true));
      dispatch(setErrorCodes(error.payload.errors));
      resetHookState();
    }
  }, [error]);

  useEffect(() => {
    const bets = getBets();
    const summaryValues = getSummaryValues();
    dispatch(triggerSetBetsAction(bets));
    dispatch(triggerSetSummaryValuesAction(summaryValues));
  }, []);

  useEffect(() => {
    setBets(bets);
    dispatch(
      setTotalOddsValue(
        Math.round(
          bets.reduce((a, b) => (b.odds ? a * b.odds!.decimal : a * 1), 1) *
            100,
        ) / 100,
      ),
    );

    //clear statusOfPendingBetsInterval when there are no bets to check
    const areBetsWithLoadingStateExist = bets.some(
      (el) => el.status === "loading",
    );
    if (!areBetsWithLoadingStateExist) {
      if (statusOfPendingBetsInterval) {
        clearInterval(statusOfPendingBetsInterval);
        setStatusOfPendingBetsInterval(null);
      }

      if (statusOfPendingBetsTimeout) {
        clearTimeout(statusOfPendingBetsTimeout);
        setStatusOfPendingBetsTimeout(null);
      }
    }
  }, [bets]);

  const { spy } = useSpy();

  const removeErrorOnBetsLengthChange = (values: { prevValues?: Array<Bet>; values?: Array<Bet> }) => {
    if (values.values?.length !== values.prevValues?.length) {
      dispatch(setIsErrorVisible(false));
    }
  };

  spy(bets, removeErrorOnBetsLengthChange);

  useEffect(() => {
    setSummaryValues(summaryValues);
  }, [summaryValues]);

  const adjustBets = (data: Array<Bet>): Array<BetSlipData> =>
    data?.map((el) => ({
      ...el,
      betslipId: el.brandMarketId.concat(el.selectionId),
    }));

  const adjustedBetsData: Array<BetSlipData> = adjustBets(bets);

  useEffect(() => {
    if (setHeaderBetsCount) {
      setHeaderBetsCount(adjustedBetsData.length);
    }
    if (!adjustedBetsData.length) {
      dispatch(setIsErrorVisible(false));
    }
    dispatch(setSingleBets(adjustedBetsData));
  }, [adjustedBetsData]);

  const prepareBetData = () => {
    const adjustedBetsWithLoadingState = adjustBets(bets).filter(
      (el) => el.status === "loading",
    );

    return adjustedBetsWithLoadingState.map((el) => ({
      marketId: el.brandMarketId,
      selectionId: el.selectionId,
      stake: {
        amount: summaryValues.betValues[el.betslipId].bet,
        // to change
        currency: "USD",
      },
      odds: el.odds!.decimal,
      acceptBetterOdds: acceptBetterOddsValue,
    }));
  };

  useEffect(() => {
    if (!readyForSendSingleBets) return;
    if (!geolocation.isClientConnected) {
      dispatch(setIsGeocomplyRequired(true));
      setReadyForSendSingleBets(false);
      return;
    }

    geolocation.triggerLocationCheck("Wager");

    const dataWithProperStatus = bets.map((el) => ({
      ...el,
      status: Status.Loading,
    }));
    dispatch(triggerSetBetsAction(dataWithProperStatus));
  }, [readyForSendSingleBets]);

  useEffect(() => {
    if (!readyForSendSingleBets) return;
    if (geolocation.isLoading) return;
    if (
      geolocation.response &&
      geolocation.response.result == GeocomplyResultEnum.PASSED
    ) {
      dispatch(setErrorCodes([]));
      triggerApi(prepareBetData(), undefined, {
        "x-geolocation": `update-me`,
      });
    } else {
      dispatch(setIsGeocomplyLocationFailed(true));
      geolocation.clearLocationState();

      const dataWithProperStatus = bets.map((el) => ({
        ...el,
        status: undefined,
      }));
      dispatch(triggerSetBetsAction(dataWithProperStatus));
    }

    setReadyForSendSingleBets(false);
  }, [geolocation.isLoading]);

  useEffect(() => {
    //structure prepared to send multi bets
  }, [readyForSendMultiBets]);

  const resetBetslipItemsStatus = () => {
    dispatch(setErrorCodes([]));
    const dataWithProperStatus = bets.map((el) => ({
      ...el,
      status: undefined,
    }));
    dispatch(triggerSetBetsAction(dataWithProperStatus));
  };

  return (
    <div>
      <FakeBackground />
      <BetslipContainer>
        <MainTabsComponent
          closeBetSlip={closeBetSlip}
          mainTabs={mainTabs}
          setMainTabs={setMainTabs}
          secondaryTabs={secondaryTabs}
          setSecondaryTabs={setSecondaryTabs}
        />
        <div style={{ width: "100%" }}>
          {mainTabs === 0 && adjustedBetsData.length > 0 && (
            <BetslipSummary
              summaryValues={summaryValues}
              setReadyForSendSingleBets={setReadyForSendSingleBets}
              setReadyForSendMultiBets={setReadyForSendMultiBets}
              selectedTab={
                secondaryTabs ? SecondaryTabs.MUTLI : SecondaryTabs.SINGLE
              }
              acceptBetterOddsValue={acceptBetterOddsValue}
              setAcceptBetterOddsValue={setAcceptBetterOddsValue}
              resetBetslipItemsStatus={resetBetslipItemsStatus}
            />
          )}
        </div>
      </BetslipContainer>
    </div>
  );
};
export { BetslipComponent };
