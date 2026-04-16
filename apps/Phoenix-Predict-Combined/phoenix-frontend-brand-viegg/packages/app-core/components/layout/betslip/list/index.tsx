import React, { useState, useEffect, useRef } from "react";
import {
  BetslipSettingsListItem,
  EmptyBetslipBody,
  EmptyBetslipMessage,
  EmptyBetslipFeatureCard,
  EmptyBetslipFeatureDescription,
  EmptyBetslipFeatureGrid,
  EmptyBetslipFeatureIcon,
  EmptyBetslipFeatureTitle,
  EmptyBetslipSubtitle,
  EmptyBetslipTitle,
  StakeControlHeader,
  StakeControlHint,
  StakeControlLabel,
  StakeControlPanel,
  StakeInputShell,
  StakeListItem,
  StakeQuickChipButton,
  StakeQuickChipRow,
} from "../index.styled";
import { useTranslation } from "i18n";
import { useDispatch, useSelector } from "react-redux";
import {
  setBets,
  setSummaryValues,
  setBetValues,
  selectBetValues,
  setMultiBetsStake,
  selectMultiBetsStake,
  selectSummaryValues,
  selectShouldScrollToErrorElement,
  setShouldScrollToErrorElement,
  selectBetslipErrorCodes,
  selectIsBetslipErrorVisible,
  selectIsListErrorVisble,
  setIsListErrorVisible,
} from "../../../../lib/slices/betSlice";
import { BetslipListElement } from "./list-element";
import { Bet, useSpy } from "@phoenix-ui/utils";
import { ListWrapper } from "./list-wrapper";
import { ScrollableBetslipList } from "./index.styled";
import { ListErrorContainer } from "./list-element/index.styled";
import { SecondaryTabs } from "..";
import { useCurrency } from "../../../../services/currency";
import { CoreInputNumber } from "../../../ui/inputNumber";
import { Gift, Layers, Ticket, Zap } from "lucide-react";

export type BetSlipData = Bet & { betslipId: string };

type BetslipListProps = {
  betslipData: Array<BetSlipData>;
  noInteract: boolean;
  infiniteScroll: boolean;
  hasMore?: boolean;
  loading?: boolean;
  setNextPageData?: () => void;
  setInfiniteScrollLoading?: (x: boolean) => void;
  selectedTab: SecondaryTabs;
};

const BetslipList: React.FC<BetslipListProps> = ({
  betslipData,
  noInteract,
  infiniteScroll,
  hasMore,
  loading,
  setNextPageData,
  setInfiniteScrollLoading,
  selectedTab,
}) => {
  const { t } = useTranslation("betslip");
  const [data, setData] = useState(betslipData);
  const betValues = useSelector(selectBetValues);
  const summaryValues = useSelector(selectSummaryValues);
  const dispatch = useDispatch();
  const isListErrorVisible = useSelector(selectIsListErrorVisble);

  const saveBets = (newBets: any) => {
    !noInteract && dispatch(setIsListErrorVisible(false));
    dispatch(setBets(newBets));
    if (!newBets.length) {
      dispatch(setMultiBetsStake(0));
    }
  };
  const errorCodes = useSelector(selectBetslipErrorCodes);
  const isErrorVisible = useSelector(selectIsBetslipErrorVisible);
  const { spy } = useSpy();

  const { formatCurrencyValue } = useCurrency();
  const multiBetsStake = useSelector(selectMultiBetsStake);
  const multiStakeChips = [10, 25, 50];
  const [itemsWithError, setItemsWithError] = useState<Array<string>>([]);
  useEffect(() => {
    setData(betslipData);
  }, [betslipData]);

  useEffect(() => {
    !noInteract && dispatch(setIsListErrorVisible(false));
  }, [betslipData.length]);

  useEffect(() => {
    const betSum = Object.values(betValues).reduce(
      (acc, val) => acc + val.bet,
      0,
    );
    const toRetunSum = Object.values(betValues).reduce(
      (acc, val) => acc + val.toReturn,
      0,
    );
    dispatch(
      setSummaryValues({
        totalStake: Math.round(betSum * 100) / 100,
        possibleReturn: Math.round(toRetunSum * 100) / 100,
        betValues,
        totalOdds:
          Math.round(
            data.reduce((a, b) => (b.odds ? a * b.odds!.decimal : a * 1), 1) *
              100,
          ) / 100,
        multiBetsPossibleReturn: summaryValues.multiBetsPossibleReturn,
      }),
    );
  }, [betValues]);

  const removeElement = (id: string) => {
    saveBets(data.filter((el) => el.betslipId !== id));
    let { [id]: omit, ...res } = betValues;
    dispatch(setBetValues(res));
  };

  const setValueForCurrentBet = (id: string, value: number) => {
    !noInteract && dispatch(setIsListErrorVisible(false));
    const dataElement = data.find((el) => el.betslipId === id);
    if (dataElement) {
      const odds = dataElement.odds;
      dispatch(
        setBetValues({
          ...betValues,
          [id]: {
            bet: value,
            toReturn: value * odds!.decimal,
          },
        }),
      );
    }
  };

  const handleInfiniteOnLoad = () => {
    if (setNextPageData) {
      setNextPageData();
    }
    if (setInfiniteScrollLoading) {
      setInfiniteScrollLoading(true);
    }
  };

  const renderErrors = () => {
    return (
      !noInteract &&
      errorCodes?.map((error) => (
        <ListErrorContainer key={error.errorCode}>
          {t(`api-errors:${error.errorCode}`)}
        </ListErrorContainer>
      ))
    );
  };

  const listEndRef = useRef<null | HTMLLIElement>(null);

  const firstItemWithError = data.find((dataEl) =>
    itemsWithError.find((itemWithError) => itemWithError === dataEl.betslipId),
  );

  const firstItemWithErrorRef = useRef<null | HTMLLIElement>(null);

  const scrollToBottom = (values: any) => {
    if (
      values.prevValues !== undefined &&
      values.values?.length > values.prevValues?.length
    ) {
      listEndRef?.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  spy(data, scrollToBottom);

  const shouldScroll = useSelector(selectShouldScrollToErrorElement);

  useEffect(() => {
    if (isErrorVisible) {
      firstItemWithErrorRef?.current?.scrollIntoView({ behavior: "smooth" });
    }
    dispatch(setShouldScrollToErrorElement(false));
  }, [shouldScroll]);

  return data.length ? (
    <div role={"betslipList"}>
      <ListWrapper
        infiniteScroll={infiniteScroll}
        handleInfiniteOnLoad={handleInfiniteOnLoad}
        hasMore={hasMore}
        loading={loading}
      >
        <ScrollableBetslipList
          id={noInteract ? "ant-list-items" : ""}
          $nointeract={noInteract}
          itemLayout="vertical"
          dataSource={data}
          renderItem={(item: any) => (
            <>
              {firstItemWithError?.betslipId === item.betslipId && (
                <li ref={firstItemWithErrorRef} />
              )}
              <BetslipListElement
                item={item}
                isErrorVisible={isErrorVisible}
                noInteract={noInteract}
                removeElement={removeElement}
                setValueForCurrentBet={setValueForCurrentBet}
                betValues={betValues}
                selectedTab={selectedTab}
                fixtureStatus={item.fixtureStatus}
                setItemsWithError={setItemsWithError}
              />
            </>
          )}
        >
          <li ref={listEndRef} />
        </ScrollableBetslipList>
        {isListErrorVisible && (
          <BetslipSettingsListItem>{renderErrors()}</BetslipSettingsListItem>
        )}

        {isErrorVisible &&
          multiBetsStake < 0.5 &&
          selectedTab === SecondaryTabs.MUTLI && (
            <BetslipSettingsListItem>
              <ListErrorContainer>
                {t("WRONG_VALUE_ERROR", {
                  MIN_STAKE: `${formatCurrencyValue(0.5)}`,
                })}
              </ListErrorContainer>
            </BetslipSettingsListItem>
          )}
      </ListWrapper>
      {!noInteract && (
        <>
          {selectedTab === SecondaryTabs.MUTLI && (
            <StakeListItem>
              <StakeControlPanel>
                <StakeControlHeader>
                  <StakeControlLabel>{t("STAKE_PER_BET")}</StakeControlLabel>
                  <StakeControlHint>Multi-leg placement</StakeControlHint>
                </StakeControlHeader>
                <StakeInputShell>
                  <CoreInputNumber
                    value={multiBetsStake}
                    min={0}
                    onChange={(value) => dispatch(setMultiBetsStake(value))}
                  />
                </StakeInputShell>
                <StakeQuickChipRow>
                  {multiStakeChips.map((amount) => (
                    <StakeQuickChipButton
                      key={amount}
                      type="button"
                      onClick={() =>
                        dispatch(setMultiBetsStake(Math.max(0, (multiBetsStake || 0) + amount)))
                      }
                    >
                      +{formatCurrencyValue(amount)}
                    </StakeQuickChipButton>
                  ))}
                </StakeQuickChipRow>
              </StakeControlPanel>
            </StakeListItem>
          )}
        </>
      )}
    </div>
  ) : (
    <EmptyBetslipMessage role={"emptyBetslipMessage"}>
      <EmptyBetslipBody>
        <Ticket size={48} color="var(--color-muted)" />
        <EmptyBetslipTitle>Your betslip is empty</EmptyBetslipTitle>
        <EmptyBetslipSubtitle>
          Select odds above to get started.
        </EmptyBetslipSubtitle>
        <EmptyBetslipFeatureGrid>
          <EmptyBetslipFeatureCard>
            <EmptyBetslipFeatureIcon>
              <Layers size={16} />
            </EmptyBetslipFeatureIcon>
            <div>
              <EmptyBetslipFeatureTitle>
                Singles, multis, and builders
              </EmptyBetslipFeatureTitle>
              <EmptyBetslipFeatureDescription>
                The slip is wired for standard bets, multi-leg placement, and
                fixed exotic flows.
              </EmptyBetslipFeatureDescription>
            </div>
          </EmptyBetslipFeatureCard>
          <EmptyBetslipFeatureCard>
            <EmptyBetslipFeatureIcon>
              <Gift size={16} />
            </EmptyBetslipFeatureIcon>
            <div>
              <EmptyBetslipFeatureTitle>
                Freebets and promo balance
              </EmptyBetslipFeatureTitle>
              <EmptyBetslipFeatureDescription>
                Promo availability now surfaces across account, promotions, and
                the active betslip flow.
              </EmptyBetslipFeatureDescription>
            </div>
          </EmptyBetslipFeatureCard>
          <EmptyBetslipFeatureCard>
            <EmptyBetslipFeatureIcon>
              <Zap size={16} />
            </EmptyBetslipFeatureIcon>
            <div>
              <EmptyBetslipFeatureTitle>
                Odds boosts ready to apply
              </EmptyBetslipFeatureTitle>
              <EmptyBetslipFeatureDescription>
                Available boosts attach in-slip when a qualifying selection is
                present.
              </EmptyBetslipFeatureDescription>
            </div>
          </EmptyBetslipFeatureCard>
        </EmptyBetslipFeatureGrid>
      </EmptyBetslipBody>
    </EmptyBetslipMessage>
  );
};
export { BetslipList };
