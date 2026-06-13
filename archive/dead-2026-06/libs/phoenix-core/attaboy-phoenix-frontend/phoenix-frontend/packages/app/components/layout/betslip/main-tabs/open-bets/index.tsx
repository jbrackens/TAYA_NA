import React, { useEffect, useState } from "react";
import { SecondaryTabs } from "../..";
import { BetslipList } from "../../list";
import {
  selectOpenBets,
  selectHandledOpenBetsPages,
  setHandledOpenBetsPages,
  resetBetslipState,
  clearOpenBets,
  setOpenBets,
  setOpenBetsSize,
} from "../../../../../lib/slices/betSlice";
import { useSelector, useDispatch } from "react-redux";
import { useApi } from "../../../../../services/api/api-service";
import { selectIsLoggedIn } from "../../../../../lib/slices/authSlice";
import { BetDetail, BetStatusEnum } from "@phoenix-ui/utils";

type OpenBetsTabContentProps = {
  mainTabs: number;
};

export const OpenBetsTabContent: React.FC<OpenBetsTabContentProps> = ({
  mainTabs,
}) => {
  const openBetsApi = useApi(`punters/bets`, "GET");
  const handledOpenBetsPages = useSelector(selectHandledOpenBetsPages);
  const [currentOpenBetsDataPage, setCurrentOpenBetsDataPage] = useState(1);
  const [isReadyToGetBets, setIsReadyToTriggerGetBets] = useState(false);
  const [infiniteScrollLoading, setInfiniteScrollLoading] = useState(false);

  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const dispatch = useDispatch();

  const setNextOpenBetsPageData = () =>
    setCurrentOpenBetsDataPage((prev) => prev + 1);

  useEffect(() => {
    if (
      !handledOpenBetsPages.includes(currentOpenBetsDataPage) &&
      isUserLoggedIn
    ) {
      setIsReadyToTriggerGetBets(true);
      dispatch(
        setHandledOpenBetsPages([
          ...handledOpenBetsPages,
          currentOpenBetsDataPage,
        ]),
      );
    }

    if (!isUserLoggedIn) {
      dispatch(resetBetslipState());
      dispatch(clearOpenBets());
      dispatch(setOpenBetsSize(0));
    }
  }, [currentOpenBetsDataPage, isUserLoggedIn]);

  useEffect(() => {
    if (mainTabs) {
      setCurrentOpenBetsDataPage(1);
      dispatch(setHandledOpenBetsPages([]));
      setIsReadyToTriggerGetBets(true);
    }
  }, [mainTabs]);

  useEffect(() => {
    if (isReadyToGetBets) {
      const trigger = async () => {
        setInfiniteScrollLoading(true);
        try {
          openBetsApi.triggerApi(undefined, {
            query: {
              pagination: {
                currentPage: currentOpenBetsDataPage,
              },
              filters: {
                status: BetStatusEnum.OPEN,
              },
            },
          });
        } catch (err) {
          console.log(err);
        }
      };
      trigger();
      setIsReadyToTriggerGetBets(false);
    }
  }, [isReadyToGetBets]);

  useEffect(() => {
    if (openBetsApi.data) {
      setInfiniteScrollLoading(false);
      currentOpenBetsDataPage === 1 &&
        dispatch(setOpenBetsSize(openBetsApi.data.totalCount));
      const openBets = openBetsApi.data.data.map((el: BetDetail) => {
        const legChildrenWithOpenStatus = el.legs.filter(
          (leg) => leg.status === "OPEN",
        );
        const mappedLegs = legChildrenWithOpenStatus.map((leg) => ({
          brandMarketId: leg.market.id,
          marketName: leg.market.name,
          fixtureName: leg.fixture.name,
          selectionId: leg.selection.id,
          selectionName: leg.selection.name,
          odds: leg.displayOdds,
          stake: el.stake.amount,
          fixtureStatus: leg.fixture.status,
        }));

        return mappedLegs;
      });
      if (openBets.length > 0) {
        const previousOpenBets =
          currentOpenBetsDataPage === 1 ? [] : openBetsData;
        dispatch(
          setOpenBets([
            ...previousOpenBets,
            ...openBets.reduce((a: any, b: any) => a.concat(b)),
          ]),
        );
      }
    }
  }, [openBetsApi.data]);

  const openBetsData = useSelector(selectOpenBets);
  const openBetsWithBetslipId = openBetsData.map((bet) => ({
    ...bet,
    betslipId: bet.brandMarketId.concat(bet.selectionId),
  }));

  return (
    <BetslipList
      betslipData={openBetsWithBetslipId}
      noInteract={true}
      infiniteScroll={true}
      hasMore={openBetsApi?.data?.hasNextPage}
      loading={infiniteScrollLoading}
      setNextPageData={setNextOpenBetsPageData}
      setInfiniteScrollLoading={setInfiniteScrollLoading}
      selectedTab={SecondaryTabs.SINGLE}
    />
  );
};
