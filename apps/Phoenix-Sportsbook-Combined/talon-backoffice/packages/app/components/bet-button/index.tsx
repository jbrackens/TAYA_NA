import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// import { toggleBetElement } from "../../lib/slices/betSlice";
import { useTranslation } from "i18n";
import { selectBets } from "../../lib/slices/betSlice";
import { addMessageToQueue } from "../../lib/slices/channels/channelSubscriptionSlice";
import {
  ArrowUp,
  ArrowDown,
  BetButton,
  SelectionName,
  OddsValueContainer,
  SuspendedIcon,
} from "./index.styled";
import {
  MarketUpdate,
  SelectMarkets,
  removeMarketUpdate,
} from "../../lib/slices/marketSlice";
import { Competitors } from "../layout/fixture-list";
import {
  // selectAccountStatus,
  selectOddsFormat,
} from "../../lib/slices/settingsSlice";
import {
  // PunterStatusEnum,
  DisplayOddsEnum,
  DisplayOdds,
  Bet,
} from "@phoenix-ui/utils";
import { ResultModalComponent } from "../modals/result-modal";
import { StatusEnum } from "../results";
// import {
//   selectIsWsConnected,
//   // showWsErrorModal,
// } from "../../lib/slices/authSlice";

export enum ResultEnum {
  DRAW = "DRAW",
  LOST = "LOST",
  WON = "WON",
}

export type ResultType = ResultEnum.DRAW | ResultEnum.WON | ResultEnum.LOST;

type Props = {
  brandMarketId: string;
  marketName: string;
  fixtureName: string;
  selectionId: string;
  specifiers?: { value?: string; unit?: string; map?: string };
  selectionName: string;
  selectionMarketStatus?: string;
  competitors?: Competitors;
  odds: DisplayOdds;
  status: string;
  fixtureId: string;
  sportId: string;
  outcome?: ResultType;
};

const BetButtonComponent: React.FC<Props> = ({
  brandMarketId,
  // marketName,
  // fixtureName,
  selectionId,
  selectionName,
  specifiers,
  selectionMarketStatus,
  competitors,
  odds,
  // status,
  // fixtureId,
  // sportId,
  outcome,
}) => {
  const { t } = useTranslation(["bet-button"]);
  const dispatch = useDispatch();
  const [highlight, setHighlight] = useState(false);
  const bets: Array<Bet> = useSelector(selectBets);
  const marketsUpdatedData = useSelector(SelectMarkets);
  const [displayOdds, setDisplayOdds] = useState<null | DisplayOdds>(odds);
  const [isUpArrowVisible, setIsUpArrowVisible] = useState(false);
  const [isDownArrowVisible, setIsDownArrowVisible] = useState(false);
  const [selectionDisabled, setSelectionDisabled] = useState(false);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  // const accountStatus = useSelector(selectAccountStatus);
  // const isWsConnectionOpen = useSelector(selectIsWsConnected);
  const oddsFormat = useSelector(selectOddsFormat);
  const [selectionMarketStatusValue, setSelectionMarketStatusValue] = useState(
    selectionMarketStatus,
  );

  const hideArrows = () => {
    setTimeout(() => {
      setIsUpArrowVisible(false);
      setIsDownArrowVisible(false);
    }, 3000);
  };

  const showArrows = (newOdds: DisplayOdds) => {
    if (!newOdds || !displayOdds) return;

    if (newOdds.decimal > displayOdds.decimal) {
      setIsUpArrowVisible(true);
    } else if (newOdds.decimal < displayOdds.decimal) {
      setIsDownArrowVisible(true);
    }
  };

  useEffect(() => {
    if (marketsUpdatedData[brandMarketId] !== undefined) {
      const market: MarketUpdate = marketsUpdatedData[brandMarketId];

      const marketSelection = market.selectionOdds.find(
        (el) => el.selectionId === selectionId,
      );

      if (marketSelection) {
        const newOdds = marketSelection.displayOdds;
        showArrows(newOdds);
        setDisplayOdds(newOdds);
        hideArrows();
      }

      setSelectionMarketStatusValue(market.marketStatus.type);

      dispatch(removeMarketUpdate(brandMarketId));
    }
  }, [marketsUpdatedData]);

  useEffect(() => {
    dispatch(
      addMessageToQueue({
        channel: `market^${brandMarketId}`,
        event: "subscribe",
      }),
    );
    return () => {
      dispatch(
        addMessageToQueue({
          channel: `market^${brandMarketId}`,
          event: "unsubscribe",
        }),
      );
    };
  }, []);

  const addToBetSlip = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    e.stopPropagation();
    e.preventDefault();

    // disabling bet placement due to vie.gg shut down

    // if (!isWsConnectionOpen) {
    //   dispatch(showWsErrorModal());
    //   return;
    // }
    // if (accountStatus === PunterStatusEnum.ACTIVE || !accountStatus) {
    //   dispatch(
    //     toggleBetElement({
    //       brandMarketId: brandMarketId,
    //       marketName: marketName,
    //       fixtureName: fixtureName,
    //       selectionId: selectionId,
    //       selectionName: selectionName,
    //       odds: displayOdds,
    //       fixtureStatus: status,
    //       fixtureId,
    //       sportId,
    //     }),
    //   );
    //   setHighlight(!highlight);
    // } else {
    //   setIsErrorModalVisible(true);
    // }
  };

  useEffect(() => {
    setHighlight(false);
    bets.filter(function search(value) {
      if (
        value.brandMarketId === brandMarketId &&
        value.selectionId === selectionId
      ) {
        setHighlight(true);
      }
    });
  }, [bets]);

  useEffect(() => {
    // make selection disabled due to vie.gg shut down
    setSelectionDisabled(true);

    //Only market status of BETTABLE should setSelectionDisabled(true) any other status then it should always be false such as SETTLED or CANCELLED
    // selectionMarketStatusValue &&
    //   setSelectionDisabled(selectionMarketStatusValue !== "BETTABLE");
  }, [selectionMarketStatusValue]);

  const generateSelectionName = (selectionName: string, specifiers: Props["specifiers"]) => {
    let name = selectionName;

    if (competitors?.home && selectionName === "home")
      name = competitors.home.name;
    if (competitors?.away && selectionName === "away")
      name = competitors.away.name;
    if (competitors?.away && selectionName === "draw") name = t("DRAW");

    if (!specifiers) return name;
    let value = "value" in specifiers ? specifiers.value : "";
    let unit = "unit" in specifiers ? t(`MARKET_UNIT_${specifiers.unit}`) : "";
    return value ? `${name} - ${value} ${unit}` : name;
  };

  return (
    <>
      <BetButton
        $ishighlighted={highlight}
        size="large"
        onClick={(e) => addToBetSlip(e)}
        disabled={selectionDisabled || !displayOdds || !!outcome}
        role="BetButton"
      >
        <div>
          <SelectionName role={"selectionName"}>
            {generateSelectionName(selectionName, specifiers)}
          </SelectionName>
          {!!outcome ? (
            t(outcome)
          ) : (
            <OddsValueContainer role={"odds"}>
              {selectionDisabled || !displayOdds ? (
                <SuspendedIcon />
              ) : (
                <>
                  {displayOdds
                    ? displayOdds[oddsFormat as DisplayOddsEnum]
                    : "-"}
                </>
              )}
            </OddsValueContainer>
          )}
          <ArrowUp hidden={!isUpArrowVisible} />
          <ArrowDown hidden={!isDownArrowVisible} />
        </div>
      </BetButton>
      <ResultModalComponent
        status={StatusEnum.ERROR}
        title={t("ACCOUNT_RESTRICTION_TITLE")}
        subTitle={t("ACCOUNT_RESTRICTION_CONTENT")}
        okText={t("OK")}
        onOk={() => setIsErrorModalVisible(false)}
        isVisible={isErrorModalVisible}
      />
    </>
  );
};

export { BetButtonComponent };
