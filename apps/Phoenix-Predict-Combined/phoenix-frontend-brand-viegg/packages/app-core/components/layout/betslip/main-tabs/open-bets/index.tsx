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
import { selectIsLoggedIn } from "../../../../../lib/slices/authSlice";
import { BetDetail } from "@phoenix-ui/utils";
import { getUserBets } from "../../../../../services/go-api";
import { transformGoUserBetsResponse } from "../../../../../services/go-api/betting/betting-transforms";

type OpenBetsTabContentProps = {
  mainTabs: number;
};

export const OpenBetsTabContent: React.FC<OpenBetsTabContentProps> = ({
  mainTabs,
}) => {
  const handledOpenBetsPages = useSelector(selectHandledOpenBetsPages);
  const [currentOpenBetsDataPage, setCurrentOpenBetsDataPage] = useState(1);
  const [isReadyToGetBets, setIsReadyToTriggerGetBets] = useState(false);
  const [infiniteScrollLoading, setInfiniteScrollLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const isUserLoggedIn = useSelector(selectIsLoggedIn);
  const userId: string = useSelector(
    (state: any) => state.settings.userData.userId,
  );
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
    if (isReadyToGetBets && userId) {
      const trigger = async () => {
        setInfiniteScrollLoading(true);
        try {
          const goResponse = await getUserBets(userId, {
            status: "open",
            page: currentOpenBetsDataPage,
            limit: 10,
          });
          const transformed = transformGoUserBetsResponse(goResponse);

          setInfiniteScrollLoading(false);
          if (currentOpenBetsDataPage === 1) {
            dispatch(setOpenBetsSize(transformed.totalCount));
          }
          setHasMore(transformed.hasNextPage);

          const openBets = transformed.data.map((el: BetDetail) => {
            const legChildrenWithOpenStatus = el.legs.filter(
              (leg) => leg.status === "OPEN",
            );
            const mappedLegs = legChildrenWithOpenStatus.map((leg) => ({
              brandMarketId: leg.market.id,
              marketName: leg.market.name,
              fixtureName: leg.fixture.name,
              fixtureId: leg.fixture.id,
              sportId: leg.sport.id,
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
        } catch (err) {
          console.log(err);
          setInfiniteScrollLoading(false);
        }
      };
      trigger();
      setIsReadyToTriggerGetBets(false);
    }
  }, [isReadyToGetBets, userId]);

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
      hasMore={hasMore}
      loading={infiniteScrollLoading}
      setNextPageData={setNextOpenBetsPageData}
      setInfiniteScrollLoading={setInfiniteScrollLoading}
      selectedTab={SecondaryTabs.SINGLE}
    />
  );
};
