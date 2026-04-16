import React, { useState, useEffect, Dispatch, SetStateAction } from "react";
import { useTranslation } from "i18n";
import {
  BetslipStandardListItem,
  CloseButton,
  BetslipLiveBadge,
  StakeControlHeader,
  StakeControlHint,
  StakeControlLabel,
  StakeControlPanel,
  StakeInputShell,
  StakeQuickChipButton,
  StakeQuickChipRow,
} from "../../index.styled";
import { BetSlipData } from "../index";
import {
  BetValues,
  updateBetElementOdds,
  updateSummaryValuesAfterOddsUpdate,
  selectBets,
  setBets,
  selectIsOddsChangesConfirmed,
  setIsConfirmationComponentVisible,
  setIsOddsChangesConfirmed,
} from "../../../../../lib/slices/betSlice";
import {
  BetReason,
  FixtureStatusEnum,
  Bet,
  DisplayOdds,
  DisplayOddsEnum,
} from "@phoenix-ui/utils";
import {
  FixtureMetaRow,
  FixtureNameText,
  LoadingStatusText,
  MarketNameText,
  NotEnoughMoneyErrorContainer,
  OddsClose,
  PotentialReturnLabel,
  PotentialReturnPanel,
  PotentialReturnValue,
  SelectionBody,
  SelectionCardHeader,
  SelectionHeaderMeta,
  SelectionNameText,
  SelectionOddsPill,
  StakeAndReturnRow,
} from "./index.styled";
import { useCurrency } from "../../../../../services/currency";
import { SecondaryTabs } from "../..";
import { useSelector, useDispatch } from "react-redux";
import {
  SelectMarkets,
  MarketUpdate,
} from "../../../../../lib/slices/marketSlice";
import { SelectFixtures } from "../../../../../lib/slices/fixtureSlice";
import { isEmpty } from "lodash";
import { addMessageToQueue } from "../../../../../lib/slices/channels/channelSubscriptionSlice";
import { selectOddsFormat } from "../../../../../lib/slices/settingsSlice";
import { CoreInputNumber } from "../../../../ui/inputNumber";
import {
  selectMaxStake,
  selectMinStake,
} from "../../../../../lib/slices/siteSettingsSlice";
import { motion } from "framer-motion";

type BetslipListElementProps = {
  item: BetSlipData;
  isErrorVisible: boolean;
  noInteract: boolean;
  removeElement: (id: string) => void;
  setValueForCurrentBet: (id: string, value: number) => void;
  betValues: BetValues;
  selectedTab: SecondaryTabs;
  fixtureStatus: string;
  setItemsWithError: Dispatch<SetStateAction<string[]>>;
};

const BetslipListElement: React.FC<BetslipListElementProps> = ({
  item,
  isErrorVisible,
  noInteract,
  removeElement,
  setValueForCurrentBet,
  betValues,
  selectedTab,
  fixtureStatus,
  setItemsWithError,
}) => {
  const { formatCurrencyValue } = useCurrency();
  const { t } = useTranslation("betslip");
  const getInputValue = (item: BetSlipData) =>
    betValues[item.betslipId]?.bet ? betValues[item.betslipId].bet : 0;
  const inputValue = getInputValue(item);

  const [displayOdds, setDisplayOdds] = useState<null | DisplayOdds>(item.odds);
  const marketsUpdatedData = useSelector(SelectMarkets);
  const oddsChangesConfirmed = useSelector(selectIsOddsChangesConfirmed);
  const dispatch = useDispatch();
  const bets: Array<Bet> = useSelector(selectBets);
  const fixturesUpdatedData = useSelector(SelectFixtures);
  const getValueToReturn = (item: BetSlipData) =>
    noInteract && item.stake && displayOdds
      ? item.stake * displayOdds.decimal
      : Math.round((betValues[item.betslipId]?.toReturn || 0) * 100) / 100;

  const oddsFormat = useSelector(selectOddsFormat);
  const maxStake = useSelector(selectMaxStake);
  const minStake = useSelector(selectMinStake);
  const quickStakeOptions = [10, 25, 50];

  const generateElementError = (reason: BetReason | undefined) => {
    switch (reason) {
      case BetReason.INSUFFICIENT_FUNDS:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("NOT_ENOUGH_MONEY_ERROR")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.STAKE_TOO_HIGH:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("STAKE_TOO_HIGH", { MAX_STAKE: maxStake })}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.SELECTION_ODDS_HAVE_CHANGED:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("ODDS_HAVE_CHANGED")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.NOT_BETTABLE:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("NOT_BETTABLE_BET_ERROR")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.CANNOT_BET:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("CANNOT_BET_ERROR")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.MARKET_NOT_FOUND:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("MARKET_NOT_FOUND")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.PUNTER_DOES_NOT_EXIST:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("PUNTER_DOES_NOT_EXIST")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.SELECTION_NOT_FOUND:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("SELECTION_NOT_FOUND")}
          </NotEnoughMoneyErrorContainer>
        );
      case BetReason.WALLET_NO_FOUND:
      case BetReason.RESERVATION_ALREADY_EXISTS:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("UNABLE_TO_PLACE_BET")}
          </NotEnoughMoneyErrorContainer>
        );
      default:
        return (
          <NotEnoughMoneyErrorContainer>
            {t("UNKNOWN_ERROR")}
          </NotEnoughMoneyErrorContainer>
        );
    }
  };

  const elementError = generateElementError(item.reason);

  useEffect(() => {
    elementError !== undefined || !inputValue
      ? setItemsWithError((prev) => {
          if (!prev.includes(item.betslipId)) {
            return [...prev, item.betslipId];
          }
          return prev;
        })
      : setItemsWithError((prev) => prev.filter((el) => el !== item.betslipId));
  }, [elementError, inputValue]);

  const isOddsNew = (newOdds: DisplayOdds) => {
    if (!newOdds || !displayOdds) return;
    return newOdds.decimal !== displayOdds.decimal;
  };

  //subscribing to fixture and market data

  useEffect(() => {
    if (marketsUpdatedData[item.brandMarketId] !== undefined) {
      const market: MarketUpdate = marketsUpdatedData[item.brandMarketId];

      const marketSelection = market.selectionOdds.find(
        (el) => el.selectionId === item.selectionId,
      );

      if (marketSelection) {
        const newOdds = marketSelection.displayOdds;

        if (!newOdds || !isOddsNew(newOdds)) return;

        dispatch(setIsConfirmationComponentVisible(true));

        !noInteract && setDisplayOdds(newOdds);

        dispatch(
          updateSummaryValuesAfterOddsUpdate({
            selectionId: item.selectionId,
            brandMarketId: item.brandMarketId,
            newOddsValue: newOdds,
          }),
        );
      }
    }
  }, [marketsUpdatedData]);

  useEffect(() => {
    if (!oddsChangesConfirmed) return;

    dispatch(setIsOddsChangesConfirmed(false));

    dispatch(
      updateBetElementOdds({
        selectionId: item.selectionId,
        brandMarketId: item.brandMarketId,
        newOddsValue: displayOdds,
      }),
    );
  }, [oddsChangesConfirmed]);

  useEffect(() => {
    dispatch(
      addMessageToQueue({
        channel: `market^${item.brandMarketId}`,
        event: "subscribe",
      }),
    );
    dispatch(
      addMessageToQueue({
        channel: `fixture^${item.sportId}^${item.fixtureId}`,
        event: "subscribe",
      }),
    );
    return () => {
      dispatch(
        addMessageToQueue({
          channel: `market^${item.brandMarketId}`,
          event: "unsubscribe",
        }),
      );
      dispatch(
        addMessageToQueue({
          channel: `fixture^${item.sportId}^${item.fixtureId}`,
          event: "unsubscribe",
        }),
      );
      setItemsWithError((prev) => prev.filter((el) => el !== item.betslipId));
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(fixturesUpdatedData) && bets.length) {
      dispatch(
        setBets(
          bets.map((bet) => {
            if (fixturesUpdatedData[bet.fixtureId] !== undefined) {
              return {
                ...bet,
                fixtureStatus: fixturesUpdatedData[bet.fixtureId].status,
              };
            }
            return bet;
          }),
        ),
      );
    }
  }, [fixturesUpdatedData]);

  const applyQuickStake = (amount: number) => {
    const nextValue = Math.min(maxStake, (inputValue || 0) + amount);
    setValueForCurrentBet(item.betslipId, nextValue);
  };

  const applyMaxStake = () => {
    setValueForCurrentBet(item.betslipId, maxStake);
  };

  const isLiveFixture =
    fixtureStatus === FixtureStatusEnum.IN_PLAY || fixtureStatus === "LIVE";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <BetslipStandardListItem key={item.betslipId}>
        <SelectionCardHeader>
          <SelectionHeaderMeta>
            <SelectionNameText role={"selectionName"}>
              {item.selectionName}
            </SelectionNameText>
            <MarketNameText role={"marketName"}>{item.marketName}</MarketNameText>
          </SelectionHeaderMeta>
          <OddsClose>
            <SelectionOddsPill key="odds" role={"odds"}>
              {displayOdds
                ? displayOdds[oddsFormat as DisplayOddsEnum]
                : "-"}
            </SelectionOddsPill>
            {!noInteract ? (
              <CloseButton
                key="close"
                onClick={() => removeElement(item.betslipId)}
              />
            ) : null}
          </OddsClose>
        </SelectionCardHeader>
        <SelectionBody>
          <FixtureMetaRow>
            <FixtureNameText role={"fixtureName"}>{item.fixtureName}</FixtureNameText>
            {isLiveFixture ? <BetslipLiveBadge>{t("LIVE")}</BetslipLiveBadge> : null}
          </FixtureMetaRow>
          {selectedTab === SecondaryTabs.SINGLE && (
            <StakeAndReturnRow>
              <StakeControlPanel>
                <StakeControlHeader>
                  <StakeControlLabel>{t("STAKE")}</StakeControlLabel>
                  <StakeControlHint>
                    {`${formatCurrencyValue(minStake)} min`}
                  </StakeControlHint>
                </StakeControlHeader>
                <StakeInputShell>
                  <CoreInputNumber
                    value={noInteract ? item.stake : inputValue}
                    min={0}
                    onChange={(value) =>
                      setValueForCurrentBet(item.betslipId, value as number)
                    }
                    disabled={noInteract}
                  />
                </StakeInputShell>
                {!noInteract ? (
                  <StakeQuickChipRow>
                    {quickStakeOptions.map((amount) => (
                      <StakeQuickChipButton
                        key={amount}
                        type="button"
                        onClick={() => applyQuickStake(amount)}
                      >
                        +{formatCurrencyValue(amount)}
                      </StakeQuickChipButton>
                    ))}
                    <StakeQuickChipButton
                      type="button"
                      $active={inputValue === maxStake}
                      onClick={applyMaxStake}
                    >
                      Max
                    </StakeQuickChipButton>
                  </StakeQuickChipRow>
                ) : null}
              </StakeControlPanel>
              <PotentialReturnPanel>
                <PotentialReturnLabel>{t("TO_RETURN")}</PotentialReturnLabel>
                <PotentialReturnValue role={"toReturnValue"}>
                  {formatCurrencyValue(getValueToReturn(item))}
                </PotentialReturnValue>
              </PotentialReturnPanel>
            </StakeAndReturnRow>
          )}
        </SelectionBody>
        {isErrorVisible &&
          (inputValue < minStake || inputValue > maxStake) &&
          selectedTab === SecondaryTabs.SINGLE && (
            <NotEnoughMoneyErrorContainer>
              {inputValue < minStake ? (
                <>
                  {t("WRONG_VALUE_ERROR", {
                    MIN_STAKE: `${formatCurrencyValue(minStake)}`,
                  })}
                </>
              ) : (
                t("STAKE_TOO_HIGH", {
                  MAX_STAKE: formatCurrencyValue(maxStake),
                })
              )}
            </NotEnoughMoneyErrorContainer>
          )}
        {item.status === "error" && elementError}
        {item?.status === "loading" ? (
          <LoadingStatusText>{t("BET_IN_PROCESS")}</LoadingStatusText>
        ) : null}
      </BetslipStandardListItem>
    </motion.div>
  );
};
export { BetslipListElement };
