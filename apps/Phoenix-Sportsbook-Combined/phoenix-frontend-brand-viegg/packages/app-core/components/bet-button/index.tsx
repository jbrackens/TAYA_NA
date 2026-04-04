import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleBetElement } from "../../lib/slices/betSlice";
import { useTranslation } from "i18n";
import { selectBets } from "../../lib/slices/betSlice";
import { addMessageToQueue } from "../../lib/slices/channels/channelSubscriptionSlice";
import {
  ArrowUp,
  ArrowDown,
  BetButton,
  SelectionName,
  OddsValueContainer,
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
import { motion } from "framer-motion";
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
  marketName,
  fixtureName,
  selectionId,
  selectionName,
  specifiers,
  selectionMarketStatus,
  competitors,
  odds,
  status,
  fixtureId,
  sportId,
  outcome,
}) => {
  const { t } = useTranslation(["bet-button"]);
  const dispatch = useDispatch();
  const [highlight, setHighlight] = useState(false);
  const [oddsFlashState, setOddsFlashState] = useState<"up" | "down" | null>(
    null,
  );
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

  const clearOddsFlash = () => {
    setTimeout(() => {
      setOddsFlashState(null);
    }, 220);
  };

  const showArrows = (newOdds: DisplayOdds) => {
    if (!newOdds || !displayOdds) return;

    if (newOdds.decimal > displayOdds.decimal) {
      setIsUpArrowVisible(true);
      setOddsFlashState("up");
    } else if (newOdds.decimal < displayOdds.decimal) {
      setIsDownArrowVisible(true);
      setOddsFlashState("down");
    }

    clearOddsFlash();
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

    if (selectionDisabled || !displayOdds || !!outcome) {
      return;
    }

    dispatch(
      toggleBetElement({
        brandMarketId: brandMarketId,
        marketName: marketName,
        fixtureName: fixtureName,
        selectionId: selectionId,
        selectionName: selectionName,
        odds: displayOdds,
        fixtureStatus: status,
        fixtureId,
        sportId,
      }),
    );
    setHighlight(!highlight);
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
    setSelectionDisabled(
      Boolean(
        selectionMarketStatusValue && selectionMarketStatusValue !== "BETTABLE",
      ),
    );
  }, [selectionMarketStatusValue]);

  const isSuspendedOdds =
    !displayOdds ||
    Object.values(displayOdds).some(
      (value) =>
        value === null ||
        value === undefined ||
        `${value}`.includes("||") ||
        `${value}`.trim() === "",
    );

  const isSelectionUnavailable = selectionDisabled || isSuspendedOdds;

  const generateSelectionName = (selectionName: string, specifiers: any) => {
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

  const resolveSelectionLabel = (value: string) => {
    const normalized = `${value || ""}`.toLowerCase();
    if (normalized === "home") {
      return "1";
    }
    if (normalized === "draw") {
      return "X";
    }
    if (normalized === "away") {
      return "2";
    }
    return value;
  };
  const fullSelectionName = generateSelectionName(selectionName, specifiers);

  return (
    <>
      <motion.div
        animate={highlight ? { scale: [1, 0.96, 1] } : { scale: 1 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
      >
        <BetButton
          $ishighlighted={highlight}
          $flashDirection={oddsFlashState}
          size="large"
          onClick={(e) => addToBetSlip(e)}
          disabled={isSelectionUnavailable || !!outcome}
          role="BetButton"
        >
          <div>
            <SelectionName role={"selectionName"} title={fullSelectionName}>
              {resolveSelectionLabel(selectionName)}
            </SelectionName>
            {!!outcome ? (
              t(outcome)
            ) : (
              <OddsValueContainer role={"odds"}>
                {isSelectionUnavailable ? (
                  "—"
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
      </motion.div>
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
