import React, { useEffect, useMemo, useState } from "react";
import { Tooltip } from "antd";
import { useTranslation } from "i18n";
import { BetButtonComponent, ResultEnum } from "../../bet-button";
import { CurrentGame } from "../../../lib/slices/settingsSlice";
import { useEvents } from "../../../services/go-api/events/events-hooks";
import {
  transformGoEventsResponse,
  mapFixtureStatusToGoStatus,
} from "../../../services/go-api/events/events-transforms";
import type { GoEventsQuery } from "../../../services/go-api/events/events-types";
import { isEmpty } from "lodash";
import {
  BetButtonRow,
  BetButtonsContainer,
  CompetitorIdentity,
  CompetitorName,
  CompetitorRow,
  CompetitorsContainer,
  FixtureBlock,
  FixtureContent,
  FixtureHeaderAction,
  FixtureHeaderMeta,
  FixtureHeaderText,
  FixtureMain,
  FixtureSchedule,
  FixtureScheduleDate,
  FixtureScheduleTime,
  FixtureSkeletonCard,
  FxtureHeader,
  IconContainer,
  LiveBadge,
  LoadMoreButton,
  LoadMoreButtonContainer,
  MarketsCountButton,
  MarketsCountButtonContainer,
  ScoreContainer,
  ScoreValue,
  TemporaryEmptyAvater,
} from "./index.styled";
import {
  FixtureStatusEnum,
  useSpy,
  DisplayOdds,
  useTimezone,
} from "@phoenix-ui/utils";
import { PaginatedResponse } from "../../../services/api/contracts";
import { ListComponent } from "./list-component";
import { StopOutlined, PauseCircleOutlined } from "@ant-design/icons";
import { LinkWrapper } from "../../linkWrapper";
import { useRouter } from "next/router";
import {
  IntegrationMode,
  parseIntegrationMode,
} from "../../../lib/integration-mode";
import {
  buildLegacyMatchPath,
  buildSportsMatchPath,
  isSportsRoutePath,
  resolveLeagueRouteKey,
  resolveSportRouteKey,
} from "../../../lib/sports-routing";
import { ChevronRight, Gamepad2, Trophy, Tv2 } from "lucide-react";

const { SPORTSBOOK_INTEGRATION_MODE } =
  require("next/config").default().publicRuntimeConfig;

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
  gameFilter?: string;
  quickFilter?: "all" | "today" | "tomorrow";
};

const resolveCompetitionIcon = (sportKey?: string) => {
  const normalized = `${sportKey || ""}`.toLowerCase();
  if (
    normalized.includes("esport") ||
    normalized.includes("cs") ||
    normalized.includes("dota") ||
    normalized.includes("league")
  ) {
    return Gamepad2;
  }
  if (
    normalized.includes("tv") ||
    normalized.includes("stream") ||
    normalized.includes("video")
  ) {
    return Tv2;
  }
  return Trophy;
};

const isFixtureLiveStatus = (status?: string) => {
  const normalized = `${status || ""}`.toUpperCase();
  return (
    normalized === FixtureStatusEnum.IN_PLAY ||
    normalized === "LIVE" ||
    normalized === FixtureStatusEnum.BREAK_IN_PLAY
  );
};

const FixtureSkeletonRows: React.FC = () => (
  <>
    {Array.from({ length: 6 }).map((_, index) => (
      <FixtureSkeletonCard
        key={`fixture-skeleton-${index}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: [0.45, 1, 0.45], y: 0 }}
        transition={{
          delay: index * 0.08,
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        }}
      />
    ))}
  </>
);

const FixtureListComponent: React.FC<FixtureListComponentProps> = ({
  currentGame,
  competitionId,
  fixtureStatus,
  activeTab,
  gameFilter,
  quickFilter = "all",
}) => {
  const { t } = useTranslation(["fixture-list"]);
  const integrationMode = useMemo(
    () => parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
    [],
  );
  const isOddsFeedMode = integrationMode === IntegrationMode.ODDS_FEED;
  const [doFixturesHaveNextPage, setDoFixturesHaveNextPage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [queryParams, setQueryParams] = useState<Record<string, unknown>>({});
  const [listsToRender, setListsToRender] = useState<
    Array<{
      fixtures: Fixture[];
      isLoading: boolean;
    }>
  >([]);
  const [shouldResetData, setShouldResetData] = useState(false);
  const [isRefreshLoading, setIsRefreshLoading] = useState(false);
  const [oddsFeedData, setOddsFeedData] = useState<
    PaginatedResponse<Fixture> | undefined
  >(undefined);
  const [isOddsFeedLoading, setIsOddsFeedLoading] = useState(false);
  const { spy } = useSpy();
  const router = useRouter();
  const routerQuery = router?.query || {};
  const routerPathname = router?.pathname || "";
  const resolvedGameFilter = resolveSportRouteKey(
    routerQuery,
    gameFilter || "esports",
  );
  const resolvedCompetitionId =
    competitionId || resolveLeagueRouteKey(routerQuery);
  const isNativeSportsRoute = isSportsRoutePath(routerPathname);
  const { getTimeWithTimezone } = useTimezone();

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

  spy(activeTab, clearDataOnResultTab);
  spy(resolvedCompetitionId, clearDataOnResultTab);
  spy(fixtureStatus, clearDataOnResultTab);

  // Build Go events query from component filter state
  const goEventsQuery = useMemo<GoEventsQuery>(() => ({
    sport: currentGame?.id && !resolvedCompetitionId ? currentGame.id : undefined,
    league: resolvedCompetitionId || undefined,
    status: mapFixtureStatusToGoStatus(fixtureStatus),
    page: currentPage,
    limit: 20,
  }), [currentGame, resolvedCompetitionId, fixtureStatus, currentPage]);

  const goEventsResult = useEvents(goEventsQuery, !isOddsFeedMode);

  // Transform Go response → existing PaginatedResponse<Fixture> shape
  const goTransformedData = useMemo(
    () => (goEventsResult.data ? transformGoEventsResponse(goEventsResult.data) : undefined),
    [goEventsResult.data],
  );

  const isGoLoading = goEventsResult.isLoading;
  const isFixturesLoading = isOddsFeedMode ? isOddsFeedLoading : isGoLoading;

  useEffect(() => {
    if (!isFixturesLoading) {
      setIsRefreshLoading(false);
    }
  }, [isFixturesLoading]);

  // Reset data when filters change
  useEffect(() => {
    setShouldResetData(true);
    setCurrentPage(1);
  }, [currentGame, resolvedCompetitionId, fixtureStatus]);

  const resolveOddsFeedSport = (): string | undefined => {
    const candidate = `${resolvedGameFilter || ""}`.trim().toLowerCase();

    if (candidate !== "" && candidate !== "home" && candidate !== "in-play" && candidate !== "upcoming") {
      return candidate;
    }
    return undefined;
  };

  // Odds-feed mode: manual fetch (kept as-is, not migrated to Go)
  useEffect(() => {
    if (!isOddsFeedMode) return;
    if (isEmpty(queryParams)) return;

    const paginationQuery = (queryParams.pagination || {}) as {
      currentPage?: number;
      itemsPerPage?: number;
    };
    const page = paginationQuery.currentPage ?? currentPage;
    const itemsPerPage = paginationQuery.itemsPerPage ?? 20;
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(page));
    searchParams.set("itemsPerPage", String(itemsPerPage));
    const oddsFeedSport = resolveOddsFeedSport();
    if (oddsFeedSport) {
      searchParams.set("sport", oddsFeedSport);
    }
    searchParams.set("gameFilter", `${resolvedGameFilter || ""}`);
    if (fixtureStatus) {
      searchParams.set("fixtureStatus", fixtureStatus);
    }
    if (resolvedCompetitionId) {
      searchParams.set("competitionId", resolvedCompetitionId);
    }

    setIsOddsFeedLoading(true);
    fetch(`/api/odds-feed/fixtures/?${searchParams.toString()}`)
      .then((response) => {
        if (!response.ok) {
          setOddsFeedData({
            data: [],
            totalCount: 0,
            itemsPerPage: Number(itemsPerPage),
            currentPage: Number(page),
            hasNextPage: false,
          });
          return;
        }
        return response.json();
      })
      .then((payload) => {
        if (payload) {
          setOddsFeedData(payload as PaginatedResponse<Fixture>);
        }
      })
      .finally(() => {
        setIsOddsFeedLoading(false);
      });
  }, [isOddsFeedMode, currentPage, currentGame, resolvedCompetitionId, fixtureStatus]);

  // Build query params for odds-feed mode (still needed for the effect above)
  useEffect(() => {
    if (isOddsFeedMode) {
      setQueryParams({
        pagination: { currentPage, itemsPerPage: 20 },
      });
    }
  }, [isOddsFeedMode, currentPage, currentGame, resolvedCompetitionId, fixtureStatus]);

  const fetchedData = isOddsFeedMode ? oddsFeedData : goTransformedData;

  useEffect(() => {
    if (fetchedData) {
      setListsToRender((prev) => [
        ...(shouldResetData ? [] : prev),
        {
          fixtures: fetchedData.data,
          isLoading: isFixturesLoading,
        },
      ]);
      setDoFixturesHaveNextPage(fetchedData.hasNextPage);
      setShouldResetData(false);
    }
  }, [fetchedData, isFixturesLoading]);

  useEffect(() => {
    return () => {
      setListsToRender([]);
    };
  }, [currentGame]);

  const matchesQuickFilter = (fixture: Fixture) => {
    if (quickFilter === "all") {
      return true;
    }

    const fixtureDay = getTimeWithTimezone(fixture.startTime).format("YYYY-MM-DD");
    const today = getTimeWithTimezone(new Date().toISOString()).format("YYYY-MM-DD");

    if (quickFilter === "today") {
      return fixtureDay === today;
    }

    const tomorrow = getTimeWithTimezone(new Date(Date.now() + 86400000).toISOString()).format(
      "YYYY-MM-DD",
    );
    return fixtureDay === tomorrow;
  };

  const renderLiveOrDate = (status: FixtureStatusEnum, startDate: string) => {
    const normalized = `${status || ""}`.toUpperCase();
    switch (normalized) {
      case FixtureStatusEnum.IN_PLAY:
      case "LIVE":
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
          <FixtureSchedule>
            <FixtureScheduleTime>{date.format("HH:mm")}</FixtureScheduleTime>
            <FixtureScheduleDate>{date.format("D MMM")}</FixtureScheduleDate>
          </FixtureSchedule>
        );
    }
  };

  const sortSelectionOdds = (winnerMarket: Market | undefined) => {
    if (winnerMarket !== undefined) {
      const sortingArray = ["home", "draw", "away"];
      return [...winnerMarket.selectionOdds].sort(
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
    const winnerMarket =
      fixture.markets.find((market) => market.marketType === "MATCH_WINNER") ||
      (isOddsFeedMode ? fixture.markets[0] : undefined);

    if (!winnerMarket || !winnerMarket.selectionOdds.length || !matchesQuickFilter(fixture)) {
      return;
    }

    const isFinished = fixture.status === "POST_GAME";
    const isLiveFixture = isFixtureLiveStatus(fixture.status);

    const checkIsDraw = () => {
      if (isFinished) {
        const results = Object.values(fixture.competitors).reduce<Array<number>>(
          (acc, cur) => [...acc, cur.score],
          [],
        );

        return results.every((value) => value === results[0]);
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
      return undefined;
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

    const fixtureSportKey = `${
      fixture.sport.abbreviation || resolvedGameFilter || "esports"
    }`.toLowerCase();
    const fixtureLeagueKey = `${
      fixture.tournament?.tournamentId ||
      resolvedCompetitionId ||
      fixture.sport.abbreviation ||
      "all"
    }`;
    const fixtureHref = isNativeSportsRoute
      ? buildSportsMatchPath(fixtureSportKey, fixtureLeagueKey, fixture.fixtureId)
      : buildLegacyMatchPath(fixtureSportKey, fixture.fixtureId);
    const CompetitionIcon = resolveCompetitionIcon(
      fixture.sport.abbreviation || fixture.sport.sportName,
    );
    const selectionOdds = sortSelectionOdds(winnerMarket) || [];

    return (
      <FixtureBlock>
        <FxtureHeader>
          <FixtureHeaderMeta>
            <CompetitionIcon size={15} />
            <FixtureHeaderText role="tournamentName">
              {fixture.tournament.name || fixture.sport.sportName}
            </FixtureHeaderText>
          </FixtureHeaderMeta>
          <FixtureHeaderAction type="button" onClick={() => router.push(fixtureHref)}>
            More
            <ChevronRight size={12} />
          </FixtureHeaderAction>
        </FxtureHeader>
        <LinkWrapper href={fixtureHref}>
          <FixtureContent>
            <FixtureMain>
              {renderLiveOrDate(fixture.status, fixture.startTime)}
              <CompetitorsContainer>
                <CompetitorRow key={`${fixture.fixtureId}:${fixture.competitors.home.competitorId}`}>
                  <CompetitorIdentity>
                    <TemporaryEmptyAvater />
                    <CompetitorName role="homeCompetitor">
                      {fixture.competitors.home.name}
                    </CompetitorName>
                  </CompetitorIdentity>
                  {isLiveFixture ? (
                    <ScoreContainer>
                      <ScoreValue role="homeCompetitorScore">
                        {fixture.competitors.home.score}
                      </ScoreValue>
                    </ScoreContainer>
                  ) : null}
                </CompetitorRow>
                <CompetitorRow key={`${fixture.fixtureId}:${fixture.competitors.away.competitorId}`}>
                  <CompetitorIdentity>
                    <TemporaryEmptyAvater />
                    <CompetitorName role="awayCompetitor">
                      {fixture.competitors.away.name}
                    </CompetitorName>
                  </CompetitorIdentity>
                  {isLiveFixture ? (
                    <ScoreContainer>
                      <ScoreValue role="awayCompetitorScore">
                        {fixture.competitors.away.score}
                      </ScoreValue>
                    </ScoreContainer>
                  ) : null}
                </CompetitorRow>
              </CompetitorsContainer>
            </FixtureMain>
            <BetButtonsContainer>
              <BetButtonRow data-selection-count={selectionOdds.length}>
                {selectionOdds.map((selection: Selection) => (
                  <div key={selection.selectionName}>
                    <BetButtonComponent
                      brandMarketId={winnerMarket.marketId}
                      marketName={winnerMarket.marketName}
                      fixtureName={fixture.fixtureName}
                      selectionId={String(selection.selectionId)}
                      selectionName={selection.selectionName}
                      odds={selection.displayOdds}
                      competitors={fixture.competitors}
                      selectionMarketStatus={winnerMarket.marketStatus.type}
                      status={fixture.status}
                      fixtureId={fixture.fixtureId}
                      sportId={fixture.sport.sportId}
                      outcome={getOutcome(selection.selectionName)}
                    />
                  </div>
                ))}
              </BetButtonRow>
              <MarketsCountButtonContainer>
                <MarketsCountButton onClick={() => router.push(fixtureHref)}>
                  <span>{`+${fixture.marketsTotalCount}`}</span>
                </MarketsCountButton>
              </MarketsCountButtonContainer>
            </BetButtonsContainer>
          </FixtureContent>
        </LinkWrapper>
      </FixtureBlock>
    );
  };

  const renderLists = () =>
    listsToRender.map((list, idx: number) => (
      <ListComponent
        key={idx}
        fixtures={list.fixtures.filter(matchesQuickFilter)}
        isLoading={list.isLoading}
        renderFixture={renderFixture}
      />
    ));

  const shouldShowEmptySkeleton =
    (isFixturesLoading || isRefreshLoading) && listsToRender.length === 0;

  return (
    <>
      {listsToRender.length ? renderLists() : null}
      {shouldShowEmptySkeleton ? <FixtureSkeletonRows /> : null}
      {doFixturesHaveNextPage ? (
        <LoadMoreButtonContainer>
          <LoadMoreButton onClick={loadMoreFixtures} disabled={isFixturesLoading}>
            {isFixturesLoading ? "Loading..." : t("LOAD_MORE")}
          </LoadMoreButton>
        </LoadMoreButtonContainer>
      ) : null}
    </>
  );
};

export { FixtureListComponent };
