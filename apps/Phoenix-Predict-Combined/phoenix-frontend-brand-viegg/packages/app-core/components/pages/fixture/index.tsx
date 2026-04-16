import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FixtureComponent } from "../../../components/fixture";
import { useEvent } from "../../../services/go-api/events/events-hooks";
import { useMarkets } from "../../../services/go-api/markets/markets-hooks";
import { transformGoEvent } from "../../../services/go-api/events/events-transforms";
import { transformGoMarketToDetailMarket } from "../../../services/go-api/markets/markets-transforms";
import {
  FixtureKickoffCard,
  FixtureKickoffGrid,
  FixtureKickoffLabel,
  FixtureKickoffValue,
  FixtureHero,
  FixtureHeroAside,
  FixtureHeroEyebrow,
  FixtureHeroIconWrap,
  FixtureHeroMain,
  FixtureHeroSubtitle,
  FixtureHeroTitle,
  FixtureHeroTitleBlock,
  FixtureHeroTitleRow,
  FixtureBreadcrumb,
  FixtureBackButton,
  FixtureLoadingCard,
  FixtureLoadingGrid,
  FixtureLoadingHero,
  FixtureLoadingStack,
  FixtureMetricCard,
  FixtureMetricLabel,
  FixtureMetricsGrid,
  FixtureMetricValue,
  FixturePageSurface,
  FixturePanel,
  FixturePanelEmpty,
  FixturePanelEyebrow,
  FixturePanelHeader,
  FixturePanelMeta,
  FixturePanelTitle,
  FixturePanelTitleGroup,
  FixturePanelsGrid,
  FixturePill,
  FixturePillRow,
  FixtureTabButton,
  FixtureTabRail,
  FixtureTabsCard,
  FixtureTeamName,
  FixtureTeamRow,
  FixtureTeamsBoard,
  FixtureTeamScore,
  FixtureTimeline,
  FixtureTimelineHeader,
  FixtureTimelineItem,
  FixtureTimelineTimestamp,
  FixtureTimelineTitle,
  FixtureWarningBanner,
} from "./index.styled";
import { FixtureStatusEnum, DisplayOdds, useTimezone } from "@phoenix-ui/utils";
import ErrorPage from "next/error";
import dayjs from "dayjs";
import { SelectFixtures } from "../../../lib/slices/fixtureSlice";
import { addMessageToQueue } from "../../../lib/slices/channels/channelSubscriptionSlice";
import {
  selectSportByAbbreviation,
  SliceState,
} from "../../../lib/slices/sportSlice";
import {
  isFixtureStatsResponse,
  isMatchTrackerTimelineResponse,
} from "../../../services/api/contracts";
import {
  useMatchTracker,
  useFixtureStats,
  sportsbookKeys,
} from "../../../services/go-api";
import type {
  GoMatchTrackerResponse,
  GoFixtureStatsResponse,
  GoFixtureStatMetric,
} from "../../../services/go-api";
import { useQueryClient } from "@tanstack/react-query";
import {
  IntegrationMode,
  parseIntegrationMode,
} from "../../../lib/integration-mode";
import { resolveFixtureOverlays } from "./overlay-registry";
import {
  buildSportsLeaguePath,
  buildSportsMatchPath,
  buildSportsSportPath,
  isSportsRoutePath,
  resolveEventRouteKey,
  resolveSportRouteKey,
} from "../../../lib/sports-routing";
import { LinkWrapper } from "../../../components/linkWrapper";
import {
  AlertTriangle,
  ChevronLeft,
  Clock3,
  Layers,
  Trophy,
  Tv2,
} from "lucide-react";

const {
  SPORTSBOOK_INTEGRATION_MODE,
  SPORTSBOOK_FIXTURE_OVERLAYS,
} = require("next/config").default().publicRuntimeConfig;

export type SelectionOdds = {
  active: boolean;
  odds: number;
  displayOdds: DisplayOdds;
  selectionId: string;
  selectionName: string;
};

export type MarketArrayValue = {
  marketId: string;
  marketName: string;
  marketType: string;
  marketCategory: string;
  marketStatus: {
    changeReason: {
      status: string;
      type: string;
    };
    type: string;
  };
  selectionOdds: Array<SelectionOdds>;
  specifiers: {
    map: string;
    value: string;
    [key: string]: string;
  };
};

export type Market = {
  [key: string]: Array<MarketArrayValue>;
};

export type Markets = Array<Market>;

export type MarketsList = Array<MarketArrayValue>;

type CompetitorNames = "home" | "away";

type Competitors = {
  [key in CompetitorNames]: {
    abbreviation: string;
    competitorId: string;
    name: string;
    qualifier: string;
    score: number;
  };
};

type ApiData = {
  competitors: Competitors;
  fixtureId: string;
  fixtureName: string;
  isLive: boolean;
  markets: {
    [key: string]: Array<MarketArrayValue>;
  };
  marketsList: Array<MarketArrayValue>;
  marketsTotalCount: number;
  sport: {
    abbreviation: string;
    displayToPunters: boolean;
    name: string;
    sportId: string;
    startTime: string;
  };
  status: FixtureStatusEnum;
  tournament: {
    name: string;
    sportId: string;
    startTime: string;
    tournamentId: string;
  };
  startTime: string;
};

type FixtureMarketsTab = {
  key: string;
  label: string;
  markets: Markets;
};

const renderMatchTrackerClock = (clockSeconds?: number): string => {
  if (typeof clockSeconds !== "number" || clockSeconds < 0) {
    return "-";
  }
  const minutes = Math.floor(clockSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(clockSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const LIVE_REFRESH_INTERVAL_MS = 10_000;
const LIVE_STALE_THRESHOLD_MS = 45_000;

const isIsoTimestampStale = (
  value?: string,
  thresholdMs = LIVE_STALE_THRESHOLD_MS,
): boolean => {
  if (!value) {
    return false;
  }
  const parsedMs = Date.parse(value);
  if (Number.isNaN(parsedMs)) {
    return false;
  }
  return Date.now() - parsedMs > thresholdMs;
};

const renderStatsMetricName = (metricKey: string): string =>
  metricKey
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const renderStatsMetricValue = (metric: GoFixtureStatMetric): string => {
  const formatValue = (value: number): string =>
    Number.isInteger(value) ? `${value}` : value.toFixed(1);
  const home = formatValue(metric.home);
  const away = formatValue(metric.away);
  if (metric.unit === "percent") {
    return `${home}% - ${away}%`;
  }
  return `${home} - ${away}`;
};

function Fixture() {
  const { t } = useTranslation(["fixture", "common"]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedGameFilter = resolveSportRouteKey(router.query, "esports");
  const resolvedFixtureId = resolveEventRouteKey(router.query) || "";
  const resolvedLeagueKey =
    typeof router.query.leagueKey === "string" ? router.query.leagueKey : "";
  const isNativeSportsRoute = isSportsRoutePath(router.pathname);
  const integrationMode = useMemo(
    () => parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
    [],
  );
  const isOddsFeedMode = integrationMode === IntegrationMode.ODDS_FEED;
  const fixtureOverlayOverride = useMemo(() => {
    if (SPORTSBOOK_FIXTURE_OVERLAYS) {
      return SPORTSBOOK_FIXTURE_OVERLAYS;
    }
    if (!isOddsFeedMode || resolvedGameFilter === "esports") {
      return undefined;
    }
    return "stale_warning,match_tracker,stats_centre";
  }, [isOddsFeedMode, resolvedGameFilter]);

  const currentGame = useSelector((state: SliceState) =>
    selectSportByAbbreviation(state, resolvedGameFilter),
  );
  const fixtureOverlayConfig = useMemo(
    () => resolveFixtureOverlays(integrationMode, fixtureOverlayOverride),
    [fixtureOverlayOverride, integrationMode],
  );

  // Go API: fetch event + markets separately
  const goEventQuery = useEvent(resolvedFixtureId);
  const goMarketsQuery = useMarkets(
    { event_id: resolvedFixtureId },
    !!resolvedFixtureId && !isOddsFeedMode,
  );
  const isLoading = goEventQuery.isLoading || goMarketsQuery.isLoading;
  const error = goEventQuery.error || goMarketsQuery.error;
  const {
    data: matchTrackerDataRaw,
    isLoading: isMatchTrackerLoading,
  } = useMatchTracker(
    resolvedFixtureId,
    fixtureOverlayConfig.showMatchTracker && !!resolvedFixtureId,
  );
  const {
    data: fixtureStatsDataRaw,
    isLoading: isFixtureStatsLoading,
  } = useFixtureStats(
    resolvedFixtureId,
    fixtureOverlayConfig.showStatsCentre && !!resolvedFixtureId,
  );
  const [markets, setMarkets] = useState<Markets>([]);
  const [marketsWithMaps, setMarketsWithMaps] = useState<{
    [key: string]: Markets;
  }>({});
  const [marketsForAllTab, setMarketsForAllTab] = useState<Markets>([]);
  const [activeMarketTab, setActiveMarketTab] = useState<string>("all");
  const [isErrorPageVisible, setIsErrorPageVisible] = useState(false);
  const [isOddsFeedLoading, setIsOddsFeedLoading] = useState(false);
  const [oddsFeedError, setOddsFeedError] = useState(false);
  const { getTimeWithTimezone } = useTimezone();
  const fixturesUpdatedData = useSelector(SelectFixtures);
  const [fixtureData, setFixtureData] = useState<ApiData>();
  const [matchTrackerData, setMatchTrackerData] =
    useState<GoMatchTrackerResponse>();
  const [fixtureStatsData, setFixtureStatsData] =
    useState<GoFixtureStatsResponse>();
  const dispatch = useDispatch();

  const applyFixtureData = (payload: ApiData) => {
    const groupedMarkets = payload.marketsList.reduce(
      (accumulator: Market, value) => {
        const group = value.marketCategory;
        if (accumulator[group] == null) {
          accumulator[group] = [];
        }
        accumulator[group].push(value);
        return accumulator;
      },
      {},
    );

    setMarketsWithMaps({});
    setMarketsForAllTab([]);
    setMarkets(
      Object.entries(groupedMarkets).map(([key, value]) => ({
        [key]: value.sort(
          (prev, curr) =>
            Number(prev.specifiers?.value) - Number(curr.specifiers?.value),
        ),
      })),
    );
    setFixtureData(payload);
  };

  useEffect(() => {
    if (!isOddsFeedMode || !resolvedFixtureId) {
      return;
    }

    let isMounted = true;
    const loadFixture = async () => {
      setIsOddsFeedLoading(true);
      setOddsFeedError(false);
      setIsErrorPageVisible(false);
      try {
        const searchParams = new URLSearchParams();
        if (resolvedGameFilter) {
          searchParams.set("sport", resolvedGameFilter);
        }
        const response = await fetch(
          `/api/odds-feed/fixtures/${resolvedFixtureId}/?${searchParams.toString()}`,
        );
        if (!response.ok) {
          if (isMounted) {
            setOddsFeedError(true);
          }
          return;
        }

        const payload = (await response.json()) as ApiData;
        if (isMounted) {
          applyFixtureData(payload);
        }
      } catch (_error) {
        if (isMounted) {
          setOddsFeedError(true);
        }
      } finally {
        if (isMounted) {
          setIsOddsFeedLoading(false);
        }
      }
    };

    loadFixture();
    return () => {
      isMounted = false;
    };
  }, [isOddsFeedMode, resolvedFixtureId, resolvedGameFilter]);

  // WebSocket subscription for legacy (non-odds-feed) mode
  useEffect(() => {
    if (!resolvedFixtureId) return;

    if (!isOddsFeedMode && currentGame) {
      dispatch(
        addMessageToQueue({
          channel: `fixture^${currentGame?.id}^${resolvedFixtureId}`,
          event: "subscribe",
        }),
      );
      return () => {
        dispatch(
          addMessageToQueue({
            channel: `fixture^${currentGame?.id}^${resolvedFixtureId}`,
            event: "unsubscribe",
          }),
        );
      };
    }
  }, [currentGame, resolvedFixtureId, isOddsFeedMode]);

  // Transform Go event + markets → ApiData when data arrives (non-odds-feed mode)
  useEffect(() => {
    if (isOddsFeedMode) return;
    if (!goEventQuery.data) return;

    const transformedEvent = transformGoEvent(goEventQuery.data) as any;
    const transformedMarkets = (goMarketsQuery.data?.markets || []).map(
      transformGoMarketToDetailMarket,
    ) as MarketArrayValue[];

    const apiData: ApiData = {
      ...transformedEvent,
      isLive: transformedEvent.status === "IN_PLAY",
      markets: {},
      marketsList: transformedMarkets,
      marketsTotalCount: transformedMarkets.length,
      sport: {
        ...transformedEvent.sport,
        name: transformedEvent.sport.sportName,
        displayToPunters: true,
      },
    };

    applyFixtureData(apiData);
  }, [goEventQuery.data, goMarketsQuery.data, isOddsFeedMode]);

  useEffect(() => {
    if ((!isOddsFeedMode && error) || oddsFeedError) {
      setIsErrorPageVisible(true);
    }
  }, [error, oddsFeedError, isOddsFeedMode]);

  useEffect(() => {
    if (isMatchTrackerTimelineResponse(matchTrackerDataRaw)) {
      setMatchTrackerData(matchTrackerDataRaw);
    }
  }, [matchTrackerDataRaw]);

  useEffect(() => {
    if (isFixtureStatsResponse(fixtureStatsDataRaw)) {
      setFixtureStatsData(fixtureStatsDataRaw);
    }
  }, [fixtureStatsDataRaw]);

  useEffect(() => {
    if (
      !fixtureOverlayConfig.showMatchTracker &&
      !fixtureOverlayConfig.showStatsCentre
    ) {
      return;
    }
    if (resolvedFixtureId === "") {
      return;
    }
    if (!isOddsFeedMode && !currentGame) {
      return;
    }

    const matchTrackerIsLive =
      fixtureOverlayConfig.showMatchTracker &&
      matchTrackerData?.status === "in_play";
    const fixtureStatsIsLive =
      fixtureOverlayConfig.showStatsCentre &&
      fixtureStatsData?.status === "in_play";
    const shouldPollLiveData =
      fixtureData?.status === FixtureStatusEnum.IN_PLAY ||
      matchTrackerIsLive ||
      fixtureStatsIsLive;
    if (!shouldPollLiveData) {
      return;
    }

    const intervalId = setInterval(() => {
      if (fixtureOverlayConfig.showMatchTracker) {
        queryClient.invalidateQueries(sportsbookKeys.matchTracker(resolvedFixtureId));
      }
      if (fixtureOverlayConfig.showStatsCentre) {
        queryClient.invalidateQueries(sportsbookKeys.fixtureStats(resolvedFixtureId));
      }
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    currentGame,
    resolvedFixtureId,
    fixtureData?.status,
    matchTrackerData?.status,
    fixtureStatsData?.status,
    fixtureOverlayConfig.showMatchTracker,
    fixtureOverlayConfig.showStatsCentre,
    isOddsFeedMode,
  ]);

  useEffect(() => {
    if (isOddsFeedMode) {
      return;
    }

    const updatedFixtureData = fixturesUpdatedData[resolvedFixtureId];
    if (updatedFixtureData) {
      setFixtureData((prevFixture) => {
        if (prevFixture) {
          return {
            ...prevFixture,
            fixtureName: updatedFixtureData.name,
            competitors: {
              home: {
                ...prevFixture.competitors.home,
                score: updatedFixtureData.score.home,
              },
              away: {
                ...prevFixture.competitors.away,
                score: updatedFixtureData.score.away,
              },
            },
            status: updatedFixtureData.status,
            startTime: updatedFixtureData.startTime,
          };
        }
      });
    }
  }, [fixturesUpdatedData, resolvedFixtureId, isOddsFeedMode]);

  const filterMarketsByMap = (map: string): Markets => {
    const filteredMarkets = markets.map((marketEntry: any) => {
      const key = Object.keys(marketEntry)[0];
      return {
        ...marketEntry,
        [key]: marketEntry[key].filter((entry: any) => entry.specifiers.map === map),
      };
    });
    return filteredMarkets.filter(
      (marketEntry: object) => Object.values(marketEntry)[0].length !== 0,
    );
  };

  const generateDataForAllTab = (): Markets => {
    const objectData = markets.reduce((formattedMarkets, market) => {
      Object.values(market)[0].forEach((marketEl) => {
        if (marketEl.specifiers.map !== undefined) {
          const newObjectName = `${marketEl.marketType}-map${marketEl.specifiers.map}`;
          const newData =
            formattedMarkets[newObjectName] !== undefined
              ? [...formattedMarkets[newObjectName], marketEl]
              : [marketEl];
          formattedMarkets = {
            ...formattedMarkets,
            [newObjectName]: newData,
          };
        } else {
          const newData =
            formattedMarkets[marketEl.marketType] !== undefined
              ? [...formattedMarkets[marketEl.marketType], marketEl]
              : [marketEl];
          formattedMarkets = {
            ...formattedMarkets,
            [marketEl.marketType]: newData,
          };
        }
      });

      return formattedMarkets;
    }, {} as { [key: string]: MarketArrayValue[] });

    return Object.entries(objectData).map(([key, value]) => ({ [key]: value }));
  };

  useEffect(() => {
    if (markets.length > 0) {
      filterMarkets();
      setMarketsForAllTab(generateDataForAllTab());
    }
  }, [markets]);

  const filterMarkets = (n = 1) => {
    const noEmptyMarkets = filterMarketsByMap(`${n}`);
    if (noEmptyMarkets.length > 0) {
      setMarketsWithMaps((prev) => ({
        ...prev,
        [n]: noEmptyMarkets,
      }));
      filterMarkets(n + 1);
    }
  };

  const matchMarkets = useMemo(
    () =>
      markets.filter((marketEntry: any) =>
        Object.keys(marketEntry)[0].includes("MATCH"),
      ),
    [markets],
  );

  const marketTabs = useMemo<FixtureMarketsTab[]>(() => {
    const tabs: FixtureMarketsTab[] = [];
    const allMarkets = marketsForAllTab.length > 0 ? marketsForAllTab : markets;

    if (allMarkets.length > 0) {
      tabs.push({ key: "all", label: t("ALL"), markets: allMarkets });
    }

    if (matchMarkets.length > 0) {
      tabs.push({ key: "match", label: t("MATCH"), markets: matchMarkets });
    }

    Object.entries(marketsWithMaps).forEach(([key, value]) => {
      if (value.length > 0) {
        tabs.push({
          key: `map-${key}`,
          label: t("MAP", { number: key }),
          markets: value,
        });
      }
    });

    return tabs;
  }, [markets, marketsForAllTab, marketsWithMaps, matchMarkets, t]);

  useEffect(() => {
    if (marketTabs.length === 0) {
      setActiveMarketTab("all");
      return;
    }

    if (!marketTabs.some((tab) => tab.key === activeMarketTab)) {
      setActiveMarketTab(marketTabs[0].key);
    }
  }, [marketTabs, activeMarketTab]);

  const activeMarkets =
    marketTabs.find((tab) => tab.key === activeMarketTab)?.markets || [];

  const renderStatusMeta = useMemo(() => {
    switch (fixtureData?.status) {
      case FixtureStatusEnum.PRE_GAME:
        return {
          label: t("SCHEDULED"),
          variant: "default" as const,
        };
      case FixtureStatusEnum.IN_PLAY:
        return {
          label: t("LIVE"),
          variant: "live" as const,
        };
      case FixtureStatusEnum.BREAK_IN_PLAY:
        return {
          label: t("PAUSED"),
          variant: "warning" as const,
        };
      case FixtureStatusEnum.POST_GAME:
        return {
          label: t("FINALIZED"),
          variant: "default" as const,
        };
      case FixtureStatusEnum.GAME_ABANDONED:
        return {
          label: t("STOPPED"),
          variant: "warning" as const,
        };
      default:
        return {
          label: t("UNKNOWN"),
          variant: "default" as const,
        };
    }
  }, [fixtureData?.status, t]);

  const renderLoadingState = () => (
    <FixtureLoadingStack>
      <FixtureLoadingHero as={motion.div}
        animate={{ opacity: [0.45, 0.82, 0.45] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      />
      <FixtureLoadingGrid>
        {Array.from({ length: 2 }).map((_, index) => (
          <FixtureLoadingCard
            key={index}
            as={motion.div}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: [0.45, 0.8, 0.45], y: 0 }}
            transition={{
              delay: index * 0.08,
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
          />
        ))}
      </FixtureLoadingGrid>
      <FixtureLoadingCard
        as={motion.div}
        animate={{ opacity: [0.45, 0.75, 0.45] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      />
    </FixtureLoadingStack>
  );

  const renderMatchTrackerPanel = () => {
    if (!fixtureOverlayConfig.showMatchTracker) {
      return null;
    }

    return (
      <FixturePanel>
        <FixturePanelHeader>
          <FixturePanelTitleGroup>
            <FixturePanelEyebrow>Live overlay</FixturePanelEyebrow>
            <FixturePanelTitle>Match Tracker</FixturePanelTitle>
          </FixturePanelTitleGroup>
          <FixturePanelMeta>
            {matchTrackerData?.updatedAt || (isMatchTrackerLoading ? "Refreshing" : "No feed")}
          </FixturePanelMeta>
        </FixturePanelHeader>
        {matchTrackerData ? (
          <>
            <FixtureMetricsGrid>
              <FixtureMetricCard>
                <FixtureMetricLabel>Status</FixtureMetricLabel>
                <FixtureMetricValue>{matchTrackerData.status}</FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Period</FixtureMetricLabel>
                <FixtureMetricValue>{matchTrackerData.period || "-"}</FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Clock</FixtureMetricLabel>
                <FixtureMetricValue>
                  {renderMatchTrackerClock(matchTrackerData.clockSeconds)}
                </FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Incidents</FixtureMetricLabel>
                <FixtureMetricValue>{matchTrackerData.incidents.length}</FixtureMetricValue>
              </FixtureMetricCard>
            </FixtureMetricsGrid>
            {matchTrackerData.incidents.length > 0 ? (
              <FixtureTimeline>
                {matchTrackerData.incidents.map((incident) => (
                  <FixtureTimelineItem key={incident.incidentId}>
                    <FixtureTimelineHeader>
                      <FixtureTimelineTitle>{incident.type}</FixtureTimelineTitle>
                      <FixtureTimelineTimestamp>
                        {incident.period || "-"} · {renderMatchTrackerClock(incident.clockSeconds)}
                      </FixtureTimelineTimestamp>
                    </FixtureTimelineHeader>
                    <FixturePanelMeta>{incident.occurredAt}</FixturePanelMeta>
                  </FixtureTimelineItem>
                ))}
              </FixtureTimeline>
            ) : (
              <FixturePanelEmpty>{t("MATCH_TRACKER_NO_INCIDENTS")}</FixturePanelEmpty>
            )}
          </>
        ) : (
          <FixturePanelEmpty>
            {isMatchTrackerLoading ? "Loading match tracker…" : t("MATCH_TRACKER_NO_INCIDENTS")}
          </FixturePanelEmpty>
        )}
      </FixturePanel>
    );
  };

  const renderStatsCentrePanel = () => {
    if (!fixtureOverlayConfig.showStatsCentre) {
      return null;
    }

    const metrics = Object.entries(fixtureStatsData?.metrics ?? {});

    return (
      <FixturePanel>
        <FixturePanelHeader>
          <FixturePanelTitleGroup>
            <FixturePanelEyebrow>Live overlay</FixturePanelEyebrow>
            <FixturePanelTitle>Stats Centre</FixturePanelTitle>
          </FixturePanelTitleGroup>
          <FixturePanelMeta>
            {fixtureStatsData?.updatedAt || (isFixtureStatsLoading ? "Refreshing" : "No feed")}
          </FixturePanelMeta>
        </FixturePanelHeader>
        {fixtureStatsData ? (
          <>
            <FixtureMetricsGrid>
              <FixtureMetricCard>
                <FixtureMetricLabel>Status</FixtureMetricLabel>
                <FixtureMetricValue>{fixtureStatsData.status}</FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Period</FixtureMetricLabel>
                <FixtureMetricValue>{fixtureStatsData.period || "-"}</FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Clock</FixtureMetricLabel>
                <FixtureMetricValue>
                  {renderMatchTrackerClock(fixtureStatsData.clockSeconds)}
                </FixtureMetricValue>
              </FixtureMetricCard>
              <FixtureMetricCard>
                <FixtureMetricLabel>Metrics</FixtureMetricLabel>
                <FixtureMetricValue>{metrics.length}</FixtureMetricValue>
              </FixtureMetricCard>
            </FixtureMetricsGrid>
            {metrics.length > 0 ? (
              <FixtureMetricsGrid>
                {metrics.map(([metricKey, metric]) => (
                  <FixtureMetricCard key={metricKey}>
                    <FixtureMetricLabel>
                      {renderStatsMetricName(metricKey)}
                    </FixtureMetricLabel>
                    <FixtureMetricValue>
                      {renderStatsMetricValue(metric)}
                    </FixtureMetricValue>
                  </FixtureMetricCard>
                ))}
              </FixtureMetricsGrid>
            ) : (
              <FixturePanelEmpty>{t("STATS_CENTRE_NO_METRICS")}</FixturePanelEmpty>
            )}
          </>
        ) : (
          <FixturePanelEmpty>
            {isFixtureStatsLoading ? "Loading stats centre…" : t("STATS_CENTRE_NO_METRICS")}
          </FixturePanelEmpty>
        )}
      </FixturePanel>
    );
  };

  const domainName = typeof window !== "undefined" ? window.location.host : "";
  const hasStaleLivePanels =
    isIsoTimestampStale(matchTrackerData?.updatedAt) ||
    isIsoTimestampStale(fixtureStatsData?.updatedAt);
  const isFixtureLoading = isOddsFeedMode ? isOddsFeedLoading : isLoading;
  const canonicalPath = isNativeSportsRoute
    ? buildSportsMatchPath(
        resolvedGameFilter,
        resolvedLeagueKey,
        resolvedFixtureId,
      )
    : `/esports-bets/${encodeURIComponent(
        resolvedGameFilter,
      )}/match/${encodeURIComponent(resolvedFixtureId)}`;
  const backPath = isNativeSportsRoute
    ? resolvedLeagueKey
      ? buildSportsLeaguePath(resolvedGameFilter, resolvedLeagueKey)
      : buildSportsSportPath(resolvedGameFilter)
    : "/esports-bets";
  const fixtureDate = fixtureData?.startTime
    ? getTimeWithTimezone(dayjs(fixtureData.startTime)).format(t("common:DATE_FORMAT"))
    : "-";
  const fixtureTime = fixtureData?.startTime
    ? getTimeWithTimezone(dayjs(fixtureData.startTime)).format("HH:mm")
    : "-";
  const fixtureTitle = fixtureData?.fixtureName || t("MATCH");
  const heroSubtitle =
    fixtureData?.status === FixtureStatusEnum.IN_PLAY
      ? "Live markets and live data panels update in place while selections stay persistent."
      : "Primary markets stay in the first view, while map and speciality groups remain one tap away.";

  if (isErrorPageVisible) {
    return <ErrorPage statusCode={404} />;
  }

  return (
    <>
      <Head>
        <link rel="canonical" href={`https://${domainName}${canonicalPath}`} />
        <title>{fixtureTitle}</title>
      </Head>
      <FixturePageSurface>
        {isFixtureLoading && !fixtureData ? renderLoadingState() : null}
        {!isFixtureLoading && fixtureData ? (
          <>
            <FixtureHero>
              <FixtureHeroMain>
                <FixtureBreadcrumb>
                  <LinkWrapper href={backPath}>
                    <FixtureBackButton>
                      <ChevronLeft size={14} />
                      Back to board
                    </FixtureBackButton>
                  </LinkWrapper>
                  <FixtureHeroEyebrow>
                    {fixtureData.tournament.name || fixtureData.sport.name}
                  </FixtureHeroEyebrow>
                </FixtureBreadcrumb>
                <FixtureHeroTitleRow>
                  <FixtureHeroIconWrap>
                    <Trophy size={22} />
                  </FixtureHeroIconWrap>
                  <FixtureHeroTitleBlock>
                    <FixtureHeroTitle>{fixtureTitle}</FixtureHeroTitle>
                    <FixtureHeroSubtitle>{heroSubtitle}</FixtureHeroSubtitle>
                  </FixtureHeroTitleBlock>
                </FixtureHeroTitleRow>
                <FixturePillRow>
                  <FixturePill $variant={renderStatusMeta.variant}>
                    {fixtureData.status === FixtureStatusEnum.IN_PLAY ? (
                      <Tv2 size={14} />
                    ) : (
                      <Clock3 size={14} />
                    )}
                    {renderStatusMeta.label}
                  </FixturePill>
                  <FixturePill>
                    <Layers size={14} />
                    {fixtureData.marketsTotalCount} total markets
                  </FixturePill>
                  <FixturePill>
                    <Trophy size={14} />
                    {fixtureData.sport.abbreviation}
                  </FixturePill>
                </FixturePillRow>
              </FixtureHeroMain>
              <FixtureHeroAside>
                <FixtureTeamsBoard>
                  <FixtureTeamRow>
                    <FixtureTeamName>{fixtureData.competitors.home.name}</FixtureTeamName>
                    <FixtureTeamScore>
                      {fixtureData.competitors.home.score}
                    </FixtureTeamScore>
                  </FixtureTeamRow>
                  <FixtureTeamRow>
                    <FixtureTeamName>{fixtureData.competitors.away.name}</FixtureTeamName>
                    <FixtureTeamScore>
                      {fixtureData.competitors.away.score}
                    </FixtureTeamScore>
                  </FixtureTeamRow>
                </FixtureTeamsBoard>
                <FixtureKickoffGrid>
                  <FixtureKickoffCard>
                    <FixtureKickoffLabel>Date</FixtureKickoffLabel>
                    <FixtureKickoffValue>{fixtureDate}</FixtureKickoffValue>
                  </FixtureKickoffCard>
                  <FixtureKickoffCard>
                    <FixtureKickoffLabel>Start time</FixtureKickoffLabel>
                    <FixtureKickoffValue>{fixtureTime}</FixtureKickoffValue>
                  </FixtureKickoffCard>
                </FixtureKickoffGrid>
              </FixtureHeroAside>
            </FixtureHero>

            {fixtureOverlayConfig.showStaleWarning && hasStaleLivePanels ? (
              <FixtureWarningBanner>
                <AlertTriangle size={16} />
                {t("LIVE_DATA_STALE_WARNING")}
              </FixtureWarningBanner>
            ) : null}

            {fixtureOverlayConfig.showMatchTracker ||
            fixtureOverlayConfig.showStatsCentre ? (
              <FixturePanelsGrid>
                {renderMatchTrackerPanel()}
                {renderStatsCentrePanel()}
              </FixturePanelsGrid>
            ) : null}

            <FixtureTabsCard>
              <FixturePanelHeader>
                <FixturePanelTitleGroup>
                  <FixturePanelEyebrow>Markets</FixturePanelEyebrow>
                  <FixturePanelTitle>Available selections</FixturePanelTitle>
                </FixturePanelTitleGroup>
                <FixturePanelMeta>
                  {marketTabs.length} view{marketTabs.length === 1 ? "" : "s"}
                </FixturePanelMeta>
              </FixturePanelHeader>
              <FixtureTabRail>
                {marketTabs.map((tab) => (
                  <FixtureTabButton
                    key={tab.key}
                    $active={tab.key === activeMarketTab}
                    onClick={() => setActiveMarketTab(tab.key)}
                  >
                    {tab.label}
                  </FixtureTabButton>
                ))}
              </FixtureTabRail>
              <FixtureComponent
                markets={activeMarkets}
                fixtureName={fixtureData.fixtureName}
                competitors={fixtureData.competitors}
                fixtureStatus={fixtureData.status}
                fixtureId={fixtureData.fixtureId}
                sportId={fixtureData.sport.sportId}
              />
            </FixtureTabsCard>
          </>
        ) : null}
      </FixturePageSurface>
    </>
  );
}

Fixture.namespacesRequired = [...defaultNamespaces, "fixture"];

export default Fixture;
