import React, { useEffect, useState } from "react";
import { Row, Col, List, Tooltip } from "antd";
import { CoreSpin } from "./../../ui/spin";
import { useTranslation } from "i18n";
import { BetButtonComponent, ResultEnum } from "../../bet-button";
import { useApi } from "../../../services/api/api-service";
import { CurrentGame } from "../../../lib/slices/settingsSlice";
import { isEmpty } from "lodash";
import {
  AvatarComponentStyled,
  StyledDivider,
  FxtureHeader,
  FixtureContainer,
  FixtureContent,
  MarketsCountButton,
  BetButtonsContainer,
  DateContainer,
  CompetitorsContainer,
  LiveBadge,
  ScoreContainer,
  MarketsCountButtonContainer,
  CompetitorName,
  BetButtonRow,
  MobileDateContainer,
  LoadMoreButton,
  LoadMoreButtonContainer,
  TemporaryEmptyAvater,
  IconContainer,
} from "./index.styled";
import {
  FixtureStatusEnum,
  useSpy,
  DisplayOdds,
  useTimezone,
} from "@phoenix-ui/utils";
import { ListComponent } from "./list-component";
import { StopOutlined, PauseCircleOutlined } from "@ant-design/icons";
import { LinkWrapper } from "../../linkWrapper";
import { useRouter } from "next/router";

type CompetitorNames = "home" | "away";

export type Competitors = {
  [key in CompetitorNames]: {
    competitorId: string;
    name: string;
    abbreviation: string;
    qualifier: string;
    score: number;
  };
};

export type Selection = {
  odds: number;
  displayOdds: DisplayOdds;
  selectionId: number;
  selectionName: string;
};

export type Market = {
  marketId: string;
  marketName: string;
  selectionOdds: Selection[];
  marketType: string;
  marketStatus: {
    type: string;
  };
};

export type Fixture = {
  fixtureId: string;
  fixtureName: string;
  startTime: string;
  sport: {
    sportId: string;
    sportName: string;
    abbreviation: string;
  };
  score: {
    home: number;
    away: number;
  };
  markets: Market[];
  marketsTotalCount: number;
  competitors: Competitors;
  tournament: {
    name: string;
    sportId: string;
    startTime: string;
    tournamentId: string;
  };
  status: FixtureStatusEnum;
  subscribed?: boolean;
};

export type FixtureListComponentProps = {
  currentGame?: CurrentGame;
  competitionId?: string;
  fixtureStatus?: string;
  activeTab?: string;
};

const FixtureListComponent: React.FC<FixtureListComponentProps> = ({
  currentGame,
  competitionId,
  fixtureStatus,
  activeTab,
}) => {
  const { t } = useTranslation(["fixture-list"]);
  const { triggerApi, isLoading, data } = useApi("fixtures", "GET");
  const [doFixturesHaveNextPage, setDoFixturesHaveNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [queryParams, setQueryParams] = useState({});
  const [listsToRender, setListsToRender] = useState<any>([]);
  const [shouldResetData, setShouldResetData] = useState(false);
  const [isRefreshLoading, setIsRefreshLoading] = useState(false);
  const { spy } = useSpy();
  const router = useRouter();
  const clearDataOnResultTab = (values: {
    prevValues: string;
    values: string;
  }) => {
    if (values.prevValues !== values.values) {
      setListsToRender([]);
      setDoFixturesHaveNextPage(false);
      setCurrentPage(1);
      setIsRefreshLoading(true);
    }
  };

  //clear lists during tab and competitonID change
  spy(activeTab, clearDataOnResultTab);
  spy(competitionId, clearDataOnResultTab);
  spy(fixtureStatus, clearDataOnResultTab);

  useEffect(() => {
    if (!isLoading) {
      setIsRefreshLoading(false);
    }
  }, [isLoading]);

  const handleQueryParams = (page?: number) => {
    setQueryParams({
      filter: {
        ...(currentGame &&
          currentGame.id &&
          !competitionId && {
            sportId: currentGame.id,
          }),
        ...(currentGame &&
          currentGame.id &&
          competitionId && {
            tournamentId: competitionId,
          }),
        fixtureStatus: fixtureStatus,
      },

      pagination: {
        itemsPerPage: 20,
        currentPage: page ? page : currentPage,
      },
      ordering:
        fixtureStatus === "FINISHED"
          ? { startTime: "DESCENDING" }
          : { startTime: "ASCENDING" },
    });
  };

  useEffect(() => {
    setShouldResetData(true);
    setCurrentPage(1);
    handleQueryParams(1);
  }, [currentGame, competitionId, fixtureStatus]);

  useEffect(() => {
    if (currentPage > 1) {
      handleQueryParams();
    }
  }, [currentPage]);

  const fetchFxitures = (query: any) => {
    if (!isEmpty(query)) {
      triggerApi(undefined, {
        query: queryParams,
      });
    }
  };

  useEffect(() => {
    fetchFxitures(queryParams);
  }, [queryParams]);

  useEffect(() => {
    if (data) {
      setListsToRender((prev: any) => [
        ...(shouldResetData ? [] : prev),
        {
          fixtures: data.data,
          isLoading: isLoading,
        },
      ]);
      setDoFixturesHaveNextPage(data.hasNextPage);
      setShouldResetData(false);
    }
  }, [data]);

  useEffect(() => {
    return () => {
      setListsToRender([]);
    };
  }, [currentGame]);

  const { getTimeWithTimezone } = useTimezone();

  const renderLiveOrDate = (status: FixtureStatusEnum, startDate: string) => {
    switch (status) {
      case FixtureStatusEnum.IN_PLAY:
        return <LiveBadge role="liveBadge">{t("LIVE")}</LiveBadge>;
      case FixtureStatusEnum.GAME_ABANDONED:
        return (
          <IconContainer>
            <Tooltip placement="bottomLeft" title={t("ABANDONED")}>
              <StopOutlined />
            </Tooltip>
          </IconContainer>
        );
      case FixtureStatusEnum.BREAK_IN_PLAY:
        return (
          <IconContainer>
            <Tooltip placement="bottomLeft" title={t("PAUSED")}>
              <PauseCircleOutlined />
            </Tooltip>
          </IconContainer>
        );
      default:
        const date = getTimeWithTimezone(startDate);
        return (
          <>
            <Row justify={"center"}>
              <Col>{date.format("HH:mm")}</Col>
            </Row>
            <Row justify={"center"}>
              <Col>{date.format("D MMM")}</Col>
            </Row>
          </>
        );
    }
  };

  const sortSelectionOdds = (winnerMarket: Market | undefined) => {
    if (winnerMarket !== undefined) {
      const sortingArray = ["home", "draw", "away"];
      return winnerMarket.selectionOdds.sort(
        (a, b) =>
          sortingArray.indexOf(a.selectionName) -
          sortingArray.indexOf(b.selectionName),
      );
    }
  };

  const loadMoreFixtures = () => {
    setCurrentPage((prev) => prev + 1);
  };

  const renderFixture = (fixture: Fixture) => {
    const winnerMarket = fixture.markets.find(
      (market) => market.marketType === "MATCH_WINNER",
    );

    if (!winnerMarket || !winnerMarket.selectionOdds.length) {
      return;
    }

    const isFinished = fixture.status === "POST_GAME";

    const checkIsDraw = () => {
      if (isFinished) {
        const results = Object.values(fixture.competitors).reduce<
          Array<number>
        >((acc, cur) => [...acc, cur.score], []);

        return results.every((v) => v === results[0]);
      }
    };

    const isDraw = checkIsDraw();

    const getWinner = () => {
      if (isFinished && !isDraw) {
        return Object.values(fixture.competitors).reduce<Record<any, any>>(
          (acc, cur) => {
            if (acc.score) {
              return {
                score: acc.score > cur.score ? acc.score : cur.score,
                qualifier:
                  acc.score > cur.score
                    ? acc.qualifier.toLowerCase()
                    : cur.qualifier.toLowerCase(),
              };
            }
            return {
              score: cur.score,
              qualifier: cur.qualifier.toLowerCase(),
            };
          },
          {},
        ).qualifier;
      }
      return;
    };
    const winner = getWinner();

    const getOutcome = (selectionName: string) => {
      if (isFinished) {
        return isDraw
          ? ResultEnum.DRAW
          : selectionName === winner
          ? ResultEnum.WON
          : ResultEnum.LOST;
      }
      return undefined;
    };

    return (
      <FixtureContainer>
        <FxtureHeader>
          <Col>
            <AvatarComponentStyled
              id={fixture.sport.sportId}
              shape="square"
              type="sports"
              size="small"
            />
            <span role="tournamentName">{fixture.tournament.name}</span>
          </Col>
        </FxtureHeader>
        <StyledDivider />
        <LinkWrapper
          href={`/esports-bets/${fixture.sport.abbreviation}/match/${fixture.fixtureId}`}
        >
          <>
            <FixtureContent key={fixture.fixtureId} align="middle">
              <Col xl={{ span: 12 }} sm={{ span: 24 }} xs={{ span: 24 }}>
                <Row>
                  <DateContainer
                    xxl={{ span: 2 }}
                    xl={{ span: 3 }}
                    lg={{ span: 0 }}
                    md={{ span: 0 }}
                    sm={{ span: 0 }}
                    xs={{ span: 0 }}
                  >
                    {renderLiveOrDate(fixture.status, fixture.startTime)}
                  </DateContainer>
                  <CompetitorsContainer
                    xxl={{ span: 22 }}
                    xl={{ span: 21 }}
                    lg={{ span: 22 }}
                    md={{ span: 22 }}
                    sm={{ span: 22 }}
                    xs={{ span: 20 }}
                  >
                    <Row
                      key={`${fixture.fixtureId}:${fixture.competitors.home.competitorId}`}
                    >
                      <CompetitorName span="22" role="homeCompetitor">
                        {/* <AvatarComponentStyled
                      size="small"
                      id={fixture.competitors.home.competitorId}
                      type="competitors"
                    /> */}
                        <TemporaryEmptyAvater />
                        {fixture.competitors.home.name}
                      </CompetitorName>
                      <ScoreContainer span="2" role="homeCompetitorScore">
                        {fixture.competitors.home.score}
                      </ScoreContainer>
                    </Row>
                    <Row
                      key={`${fixture.fixtureId}:${fixture.competitors.away.competitorId}`}
                    >
                      <CompetitorName span="22" role="awayCompetitor">
                        {/* <AvatarComponentStyled
                      size="small"
                      id={fixture.competitors.away.competitorId}
                      type="competitors"
                    /> */}
                        <TemporaryEmptyAvater />
                        {fixture.competitors.away.name}
                      </CompetitorName>
                      <ScoreContainer span="2" role="awayCompetitorScore">
                        {fixture.competitors.away.score}
                      </ScoreContainer>
                    </Row>
                  </CompetitorsContainer>
                  <MobileDateContainer
                    xxl={{ span: 0 }}
                    xl={{ span: 0 }}
                    lg={{ span: 2 }}
                    md={{ span: 2 }}
                    sm={{ span: 2 }}
                    xs={{ span: 4 }}
                  >
                    {renderLiveOrDate(fixture.status, fixture.startTime)}
                  </MobileDateContainer>
                </Row>
              </Col>
              <Col xl={{ span: 12 }} sm={{ span: 24 }} xs={{ span: 24 }}>
                <BetButtonsContainer>
                  <Col
                    xxl={{ span: 21 }}
                    xl={{ span: 19 }}
                    lg={{ span: 22 }}
                    sm={{ span: 22 }}
                    xs={{ span: 20 }}
                  >
                    <BetButtonRow>
                      {sortSelectionOdds(winnerMarket)?.map(
                        (selection: Selection) => (
                          <Col
                            key={selection.selectionName}
                            span={
                              winnerMarket.selectionOdds.length === 3
                                ? "8"
                                : "12"
                            }
                          >
                            <BetButtonComponent
                              brandMarketId={winnerMarket.marketId}
                              marketName={winnerMarket.marketName}
                              fixtureName={fixture.fixtureName}
                              selectionId={String(selection.selectionId)}
                              selectionName={selection.selectionName}
                              odds={selection.displayOdds}
                              competitors={fixture.competitors}
                              selectionMarketStatus={
                                winnerMarket.marketStatus.type
                              }
                              status={fixture.status}
                              fixtureId={fixture.fixtureId}
                              sportId={fixture.sport.sportId}
                              outcome={getOutcome(selection.selectionName)}
                            />
                          </Col>
                        ),
                      )}
                    </BetButtonRow>
                  </Col>
                  <MarketsCountButtonContainer
                    xxl={{ span: 3 }}
                    xl={{ span: 5 }}
                    lg={{ span: 2 }}
                    sm={{ span: 2 }}
                    xs={{ span: 4 }}
                  >
                    <MarketsCountButton
                      onClick={() =>
                        router.push(
                          `/esports-bets/${fixture.sport.abbreviation}/match/${fixture.fixtureId}`,
                        )
                      }
                    >
                      <span>+{fixture.marketsTotalCount}</span>
                      <span>
                        <img src="/images/fixture_arrow.svg" />
                      </span>
                    </MarketsCountButton>
                  </MarketsCountButtonContainer>
                </BetButtonsContainer>
              </Col>
            </FixtureContent>
          </>
        </LinkWrapper>
        <StyledDivider />
      </FixtureContainer>
    );
  };

  const renderLists = () =>
    listsToRender.map((list: any, idx: number) => (
      <ListComponent
        key={idx}
        fixtures={list.fixtures}
        isLoading={list.isLoading}
        renderFixture={renderFixture}
      />
    ));

  return (
    <>
      {listsToRender.length ? (
        renderLists()
      ) : (
        <List
          split={true}
          dataSource={[]}
          loading={isLoading || isRefreshLoading}
        />
      )}
      <>
        {doFixturesHaveNextPage && (
          <LoadMoreButtonContainer>
            <LoadMoreButton onClick={loadMoreFixtures} disabled={isLoading}>
              {currentPage !== 1 && isLoading ? <CoreSpin /> : t("LOAD_MORE")}
            </LoadMoreButton>
          </LoadMoreButtonContainer>
        )}
      </>
    </>
  );
};

export { FixtureListComponent };
