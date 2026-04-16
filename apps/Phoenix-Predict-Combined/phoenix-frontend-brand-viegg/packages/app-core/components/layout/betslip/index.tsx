import React, { useState, useEffect, useContext } from "react";
import { BetslipContainer, FakeBackground } from "./index.styled";
import { useDispatch, useSelector } from "react-redux";
import { useBets, Bet, Status, useSpy, useToken } from "@phoenix-ui/utils";
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
  resetBetslipState,
  selectMultiBetsStake,
} from "../../../lib/slices/betSlice";
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
import type { PlaceBetResponseItem } from "../../../services/api/contracts";
import {
  placeBet,
  placeParlay,
  precheckBets,
  getBetStatuses,
  getFreebets,
  getOddsBoosts,
  acceptOddsBoost,
} from "../../../services/go-api";
import type {
  GoPlaceBetRequest,
  GoFreebet,
  GoOddsBoost,
} from "../../../services/go-api";
import { getSameGameComboValidationErrorCode } from "./same-game-combo";

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

const normalizePrecheckErrorCode = (value?: string): string => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length ? trimmed : "unexpectedError";
};

const resolveApiErrorCodes = (value: any): Array<{ errorCode: string }> => {
  const listErrors = value?.payload?.errors;
  if (Array.isArray(listErrors) && listErrors.length) {
    return listErrors.map((error) => ({
      ...error,
      errorCode: normalizePrecheckErrorCode(error?.errorCode),
    }));
  }

  const candidates = [
    value?.payload?.error?.details?.reasonCode,
    value?.payload?.error?.code,
    value?.payload?.reasonCode,
    value?.reasonCode,
  ];
  const reasonCode = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length,
  );
  return [{ errorCode: normalizePrecheckErrorCode(reasonCode) }];
};

const BetslipComponent: React.FC<BetslipComponentProps> = ({
  setHeaderBetsCount,
  closeBetSlip,
}) => {
  const geolocation = useContext(GeolocationContext);
  const { setBets, getBets, getSummaryValues, setSummaryValues } = useBets();
  const { getUserId } = useToken();
  const bets: Array<Bet> = useSelector(selectBets);
  const summaryValues: SummaryValues = useSelector(selectSummaryValues);
  const multiBetsStake: number = useSelector(selectMultiBetsStake);
  const userId: string = useSelector((state: any) => state.settings.userData.userId);
  const effectiveUserId = `${userId || getUserId() || ""}`.trim();
  const dispatch = useDispatch();
  // Go API: bet placement responses stored in state (replaces useApi hook data/error)
  const [placeBetData, setPlaceBetData] = useState<PlaceBetResponseItem[] | null>(null);
  const [placeBetError, setPlaceBetError] = useState<any>(undefined);

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

  const [availableFreebets, setAvailableFreebets] = useState<GoFreebet[]>([]);
  const [availableOddsBoosts, setAvailableOddsBoosts] = useState<GoOddsBoost[]>([]);
  const [appliedFreebetId, setAppliedFreebetId] = useState<string | null>(null);
  const [appliedOddsBoost, setAppliedOddsBoost] = useState<GoOddsBoost | null>(null);
  const [isApplyingOddsBoost, setIsApplyingOddsBoost] = useState(false);

  const availableFreebetsCount = availableFreebets.length;
  const availableOddsBoostCount = availableOddsBoosts.length;

  useEffect(() => {
    if (!effectiveUserId) return;
    const fetchPromotions = async () => {
      try {
        const [freebetsRes, oddsBoostsRes] = await Promise.all([
          getFreebets(effectiveUserId, "active"),
          getOddsBoosts(effectiveUserId, "available"),
        ]);
        setAvailableFreebets(freebetsRes.data || []);
        setAvailableOddsBoosts(oddsBoostsRes.data || []);
      } catch {
        // Silently fail — promotions are non-critical
      }
    };
    fetchPromotions();
  }, [effectiveUserId]);

  const runPrecheckForSingleBets = async (
    loadingBets: Array<BetSlipData>,
  ): Promise<{ shouldBlockPlacement: boolean; errorCodes: string[] }> => {
    try {
      const response = await precheckBets({
        bets: loadingBets.map((bet) => ({
          market_id: bet.brandMarketId,
          outcome_id: bet.selectionId,
          stake: summaryValues.betValues[bet.betslipId]?.bet || 0,
          odds: bet.odds?.decimal || 0,
        })),
      });

      const blockers = response.results.filter((r) => r.should_block_placement);
      if (blockers.length > 0) {
        return {
          shouldBlockPlacement: true,
          errorCodes: blockers.map((b) => b.error_code || "unexpectedError"),
        };
      }
      return { shouldBlockPlacement: false, errorCodes: [] };
    } catch {
      // If precheck fails, allow placement to proceed (fail-open)
      return { shouldBlockPlacement: false, errorCodes: [] };
    }
  };

  // Process Go API bet placement responses
  useEffect(() => {
    if (placeBetData) {
      dispatch(setIsErrorVisible(false));
      dispatch(setErrorCodes([]));
      const betsWithBetId = bets.map((el) => {
        const uuid = `${el.brandMarketId}-${el.selectionId}`;
        const elementToObserve = placeBetData.find(
          (dataEl) => `${dataEl.marketId}-${dataEl.selectionId}` === uuid,
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

      // Poll batch bet statuses (fallback if WS fails)
      dispatch(triggerSetBetsAction(betsWithBetId));
      setStatusOfPendingBetsTimeout(
        setTimeout(() => {
          setStatusOfPendingBetsInterval(
            setInterval(async () => {
              try {
                const statusResponse = await getBetStatuses({
                  bet_ids: placeBetData.map((el) => el.betId),
                });
                statusResponse.statuses.forEach((s) => {
                  handleBetUpdate(
                    { betId: s.bet_id, status: s.status } as any,
                    dispatch,
                  );
                });
              } catch {
                // Stop polling on error
                if (statusOfPendingBetsInterval) {
                  clearInterval(statusOfPendingBetsInterval);
                  setStatusOfPendingBetsInterval(null);
                }
              }
            }, PENDING_BETS_INTERVAL_TIME),
          );
        }, PENDING_BETS_TIMEOUT_TIME),
      );
      setPlaceBetData(null);
    }
  }, [placeBetData]);

  // Handle bet placement errors
  useEffect(() => {
    if (placeBetError !== undefined) {
      const dataWithProperStatus = bets.map((el) => ({
        ...el,
        status: undefined,
      }));
      const resolvedErrorCodes = resolveApiErrorCodes(placeBetError);
      dispatch(triggerSetBetsAction(dataWithProperStatus));
      dispatch(setIsListErrorVisible(true));
      dispatch(setErrorCodes(resolvedErrorCodes));
      setPlaceBetError(undefined);
    }
  }, [placeBetError]);

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

  const removeErrorOnBetsLengthChange = (values: any) => {
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

  const toggleFreebet = (freebetId: string) => {
    setAppliedFreebetId((prev) => (prev === freebetId ? null : freebetId));
  };

  const toggleOddsBoost = async (oddsBoostId: string) => {
    if (isApplyingOddsBoost) return;
    if (appliedOddsBoost?.id === oddsBoostId) {
      setAppliedOddsBoost(null);
      return;
    }
    setIsApplyingOddsBoost(true);
    try {
      await acceptOddsBoost(oddsBoostId, effectiveUserId);
      const boost = availableOddsBoosts.find((b) => b.id === oddsBoostId);
      setAppliedOddsBoost(boost || null);
      const refreshed = await getOddsBoosts(effectiveUserId, "available");
      setAvailableOddsBoosts(refreshed.data || []);
    } catch {
      // Silently fail — boost application is non-critical
    } finally {
      setIsApplyingOddsBoost(false);
    }
  };

  /** Build Go API bet requests — one per bet (Go expects single bets). */
  const prepareGoBetRequests = (): GoPlaceBetRequest[] => {
    const adjustedBetsWithLoadingState = adjustBets(bets).filter(
      (el) => el.status === "loading",
    );

    return adjustedBetsWithLoadingState.map((el) => ({
      user_id: effectiveUserId,
      market_id: el.brandMarketId,
      outcome_id: el.selectionId,
      stake: summaryValues.betValues[el.betslipId].bet,
      odds: el.odds!.decimal,
      accept_better_odds: acceptBetterOddsValue,
    }));
  };

  /** Place bets via Go API (one call per bet, aggregated). */
  const placeGoSingleBets = async () => {
    const requests = prepareGoBetRequests();
    try {
      const results = await Promise.all(requests.map((req) => placeBet(req)));
      const responseItems: PlaceBetResponseItem[] = results.map((res) => ({
        betId: res.bet_id,
        marketId: res.market_id,
        selectionId: res.outcome_id,
      }));
      setPlaceBetData(responseItems);
    } catch (err) {
      setPlaceBetError(err);
    }
  };

  useEffect(() => {
    if (!readyForSendSingleBets) return;
    let isCancelled = false;

    const startSingleBetPlacementFlow = async () => {
      dispatch(setIsErrorVisible(false));
      dispatch(setIsListErrorVisible(false));
      dispatch(setErrorCodes([]));

      if (!geolocation.isClientConnected) {
        dispatch(setIsGeocomplyRequired(true));
        setReadyForSendSingleBets(false);
        return;
      }

      const dataWithLoadingStatus = bets.map((el) => ({
        ...el,
        status: Status.Loading,
      }));
      dispatch(triggerSetBetsAction(dataWithLoadingStatus));

      const loadingBets = adjustBets(dataWithLoadingStatus).filter(
        (el) => el.status === Status.Loading,
      );
      const precheckResult = await runPrecheckForSingleBets(loadingBets);
      if (isCancelled) {
        return;
      }

      if (precheckResult.shouldBlockPlacement) {
        const dataWithProperStatus = bets.map((el) => ({
          ...el,
          status: undefined,
        }));
        dispatch(triggerSetBetsAction(dataWithProperStatus));
        dispatch(setIsListErrorVisible(true));
        dispatch(
          setErrorCodes(
            precheckResult.errorCodes.map((errorCode) => ({
              errorCode,
            })),
          ),
        );
        setReadyForSendSingleBets(false);
        return;
      }

      geolocation.triggerLocationCheck("Wager");
    };

    void startSingleBetPlacementFlow();

    return () => {
      isCancelled = true;
    };
  }, [readyForSendSingleBets]);

  useEffect(() => {
    if (!readyForSendSingleBets) return;
    if (geolocation.isLoading) return;
    if (
      geolocation.response &&
      geolocation.response.result == GeocomplyResultEnum.PASSED
    ) {
      dispatch(setErrorCodes([]));
      placeGoSingleBets();
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

  // Multi-bet placement via Go API POST /api/v1/parlays
  // Replaces the old bet builder + fixed exotic quote/accept flow.
  useEffect(() => {
    if (!readyForSendMultiBets) return;

    dispatch(setIsErrorVisible(false));
    dispatch(setIsListErrorVisible(false));
    dispatch(setErrorCodes([]));

    if (!geolocation.isClientConnected) {
      dispatch(setIsGeocomplyRequired(true));
      setReadyForSendMultiBets(false);
      return;
    }

    const dataWithLoadingStatus = bets.map((el) => ({
      ...el,
      status: Status.Loading,
    }));
    dispatch(triggerSetBetsAction(dataWithLoadingStatus));

    const loadingBets = adjustBets(dataWithLoadingStatus).filter(
      (el) => el.status === Status.Loading,
    );
    if (loadingBets.length < 2 || multiBetsStake < 0.5) {
      dispatch(setIsErrorVisible(true));
      dispatch(
        triggerSetBetsAction(
          bets.map((el) => ({
            ...el,
            status: undefined,
          })),
        ),
      );
      setReadyForSendMultiBets(false);
      return;
    }

    const comboValidationErrorCode =
      getSameGameComboValidationErrorCode(loadingBets);
    if (comboValidationErrorCode) {
      dispatch(setIsListErrorVisible(true));
      dispatch(setErrorCodes([{ errorCode: comboValidationErrorCode }]));
      dispatch(
        triggerSetBetsAction(
          bets.map((el) => ({
            ...el,
            status: undefined,
          })),
        ),
      );
      setReadyForSendMultiBets(false);
      return;
    }

    geolocation.triggerLocationCheck("Wager");
  }, [readyForSendMultiBets]);

  useEffect(() => {
    if (!readyForSendMultiBets) return;
    if (geolocation.isLoading) return;

    if (
      geolocation.response &&
      geolocation.response.result == GeocomplyResultEnum.PASSED
    ) {
      // Place parlay via Go API
      const loadingBets = adjustBets(bets).filter(
        (el) => el.status === Status.Loading,
      );

      const parlayRequest = {
        user_id: effectiveUserId,
        stake: multiBetsStake,
        legs: loadingBets.map((bet) => ({
          market_id: bet.brandMarketId,
          outcome_id: bet.selectionId,
          odds: bet.odds?.decimal || 0,
        })),
        accept_better_odds: acceptBetterOddsValue,
      };

      placeParlay(parlayRequest)
        .then(() => {
          dispatch(setIsErrorVisible(false));
          dispatch(setIsListErrorVisible(false));
          dispatch(setErrorCodes([]));
          dispatch(resetBetslipState());
        })
        .catch((err: any) => {
          dispatch(setIsListErrorVisible(true));
          dispatch(setErrorCodes(resolveApiErrorCodes(err)));
          dispatch(
            triggerSetBetsAction(
              bets.map((el) => ({
                ...el,
                status: undefined,
              })),
            ),
          );
        });
    } else {
      dispatch(setIsGeocomplyLocationFailed(true));
      geolocation.clearLocationState();
      dispatch(
        triggerSetBetsAction(
          bets.map((el) => ({
            ...el,
            status: undefined,
          })),
        ),
      );
    }

    setReadyForSendMultiBets(false);
  }, [geolocation.isLoading, readyForSendMultiBets]);

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
              availableFreebetsCount={availableFreebetsCount}
              availableOddsBoostCount={availableOddsBoostCount}
              appliedFreebetId={appliedFreebetId}
              appliedOddsBoostId={appliedOddsBoost?.id || null}
              toggleFreebet={() => {
                const targetFreebetId = appliedFreebetId || availableFreebets[0]?.id;
                if (targetFreebetId) {
                  toggleFreebet(targetFreebetId);
                }
              }}
              toggleOddsBoost={() => {
                const targetOddsBoostId =
                  appliedOddsBoost?.id || availableOddsBoosts[0]?.id;
                if (targetOddsBoostId) {
                  void toggleOddsBoost(targetOddsBoostId);
                }
              }}
              isApplyingOddsBoost={isApplyingOddsBoost}
            />
          )}
        </div>
      </BetslipContainer>
    </div>
  );
};
export { BetslipComponent };
