import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useApi } from "../../../services/api/api-service";
import { Row, Col, Tabs } from "antd";
import { CoreSpin } from "./../../ui/spin";
import { FixtureComponent } from "../../../components/fixture";
import {
  Container,
  StyledHeader,
  GameName,
  ScoreContainer,
  TeamName,
  NotStartedStatus,
  SuspendedStatus,
  EndedStatus,
  CancelledStatus,
  UnknownStatus,
  LiveStatus,
  SpinnerContainer,
  StyledMobileHeader,
  TournamentName,
} from "./index.styled";
import { StyledTabs } from "../../../components/tabs/index.styled";
import { AvatarComponent } from "../../../components/avatar";
import { FixtureStatusEnum, DisplayOdds, useTimezone } from "@phoenix-ui/utils";
import ErrorPage from "next/error";
import dayjs from "dayjs";
import { SelectFixtures } from "../../../lib/slices/fixtureSlice";
import { addMessageToQueue } from "../../../lib/slices/channels/channelSubscriptionSlice";
import {
  selectSportByAbbreviation,
  SliceState,
} from "../../../lib/slices/sportSlice";

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

function Fixture() {
  const { t } = useTranslation(["fixture", "common"]);
  const router = useRouter();
  const { gameFilter, fixtureId } = router.query as {
    gameFilter: string;
    fixtureId: string;
  };

  const currentGame = useSelector((state: SliceState) =>
    selectSportByAbbreviation(state, gameFilter),
  );

  const { data, triggerApi, isLoading, error } = useApi(
    `sports/${currentGame?.id}/fixtures/${fixtureId}`,
    "GET",
  ) as {
    data: ApiData;
    triggerApi: () => void;
    isLoading: boolean;
    error: any;
  };
  const [markets, setMarkets] = useState<Markets>([]);
  const [marketsWithMaps, setMarketsWithMaps] = useState<{
    [key: string]: Markets;
  }>({});
  const [marketsForAllTab, setMarketsForAllTab] = useState<Markets>([]);
  const [isErrorPageVisible, setIsErrorPageVisible] = useState(false);
  const { getTimeWithTimezone } = useTimezone();
  const fixturesUpdatedData = useSelector(SelectFixtures);
  const [fixtureData, setFixtureData] = useState<ApiData>();
  const dispatch = useDispatch();

  useEffect(() => {
    if (currentGame) {
      triggerApi();

      dispatch(
        addMessageToQueue({
          channel: `fixture^${currentGame?.id}^${fixtureId}`,
          event: "subscribe",
        }),
      );
      return () => {
        dispatch(
          addMessageToQueue({
            channel: `fixture^${currentGame?.id}^${fixtureId}`,
            event: "unsubscribe",
          }),
        );
      };
    }
  }, [currentGame]);

  useEffect(() => {
    if (data && !markets.length) {
      const groupedMarkets = data.marketsList.reduce(
        (groupedMarkets: Market, value) => {
          const group = value.marketCategory;

          if (groupedMarkets[group] == null) groupedMarkets[group] = [];

          groupedMarkets[group].push(value);

          return groupedMarkets;
        },
        {},
      );

      setMarkets(
        Object.entries(groupedMarkets).map(([key, value]) => {
          return {
            [key]: value.sort(
              (prev, curr) =>
                Number(prev.specifiers?.value) - Number(curr.specifiers?.value),
            ),
          };
        }),
      );

      setFixtureData(data);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setIsErrorPageVisible(true);
    }
  }, [error]);

  useEffect(() => {
    const updatedFixtureData = fixturesUpdatedData[fixtureId];
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
  }, [fixturesUpdatedData]);

  const filterMarketsByMap = (map: string): Markets => {
    const filteredMarkets = markets.map((el: any) => {
      const key = Object.keys(el)[0];
      return {
        ...el,
        [key]: el[key].filter((el: any) => el.specifiers.map === map),
      };
    });
    return filteredMarkets.filter(
      (el: object) => Object.values(el)[0].length !== 0,
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
    }, {});

    return Object.entries(objectData).map(([key, value]) => {
      return { [key]: value };
    });
  };

  useEffect(() => {
    if (markets.length > 0) {
      filterMarkets();
      setMarketsForAllTab(generateDataForAllTab());
    }
  }, [markets]);

  const filterMarkets = (n = 1) => {
    const noEmptYMarkets = filterMarketsByMap(`${n}`);
    if (noEmptYMarkets.length > 0) {
      setMarketsWithMaps((prev) => ({
        ...prev,
        [n]: noEmptYMarkets,
      }));
      filterMarkets(n + 1);
    } else {
      return;
    }
  };

  const generateStatus = () => {
    switch (fixtureData?.status) {
      case FixtureStatusEnum.PRE_GAME:
        return (
          <>
            <NotStartedStatus>
              {getTimeWithTimezone(dayjs(fixtureData?.startTime)).format(
                t("common:DATE_FORMAT"),
              )}
            </NotStartedStatus>
            <NotStartedStatus>
              {getTimeWithTimezone(dayjs(fixtureData?.startTime)).format(
                "HH:mm",
              )}
            </NotStartedStatus>
          </>
        );
      case FixtureStatusEnum.IN_PLAY:
        return <LiveStatus>{t("LIVE")}</LiveStatus>;
      case FixtureStatusEnum.BREAK_IN_PLAY:
        return <SuspendedStatus>{t("PAUSED")}</SuspendedStatus>;
      case FixtureStatusEnum.POST_GAME:
        return <EndedStatus>{t("FINALIZED")}</EndedStatus>;
      case FixtureStatusEnum.GAME_ABANDONED:
        return <CancelledStatus>{t("STOPPED")}</CancelledStatus>;
      case FixtureStatusEnum.UNKNOWN:
        return <UnknownStatus>{t("UNKNOWN")}</UnknownStatus>;
      default:
      case FixtureStatusEnum.UNKNOWN:
        return <UnknownStatus>{t("UNKNOWN")}</UnknownStatus>;
    }
  };

  const generateHeader = () => {
    if (fixtureData) {
      return (
        <StyledHeader justify={"center"} align={"middle"}>
          <Col span={8}>
            {/* <AvatarComponent
              id={data?.competitors["home"].competitorId}
              type="sports"
              size={90}
            /> */}
            <TeamName>{fixtureData?.competitors["home"].name}</TeamName>
          </Col>
          <Col span={8}>
            <AvatarComponent
              id={fixtureData?.sport.sportId}
              type="sports"
              shape={"square"}
            />
            <GameName>{fixtureData?.sport.abbreviation}</GameName>
            <TournamentName>{fixtureData?.tournament.name}</TournamentName>
            <ScoreContainer>
              {fixtureData?.competitors["home"].score} :{" "}
              {fixtureData?.competitors["away"].score}
            </ScoreContainer>
            {generateStatus()}
          </Col>
          <Col span={8}>
            {/* <AvatarComponent
              id={fixtureData?.competitors["away"].competitorId}
              type="sports"
              size={90}
            /> */}
            <TeamName>{fixtureData?.competitors["away"].name}</TeamName>
          </Col>
        </StyledHeader>
      );
    }
  };

  const generateMobileHeader = () => {
    if (fixtureData) {
      return (
        <StyledMobileHeader justify={"center"} align={"middle"}>
          <Col span={24}>
            <AvatarComponent
              id={fixtureData?.sport.sportId}
              type="sports"
              shape={"square"}
            />
            <GameName>{fixtureData?.sport.abbreviation}</GameName>
            <TournamentName>{fixtureData?.tournament.name}</TournamentName>
          </Col>
          <Col span={24}>
            <Row>
              <Col span={8}>
                {/* <AvatarComponent
                  id={fixtureData?.competitors["home"].competitorId}
                  type="sports"
                  size={90}
                /> */}
                <TeamName>{fixtureData?.competitors["home"].name}</TeamName>
              </Col>
              <Col span={8}>
                <ScoreContainer>
                  {fixtureData?.competitors["home"].score} :{" "}
                  {fixtureData?.competitors["away"].score}
                </ScoreContainer>
                {generateStatus()}
              </Col>
              <Col span={8}>
                {/* <AvatarComponent
                  id={fixtureData?.competitors["away"].competitorId}
                  type="sports"
                  size={90}
                /> */}
                <TeamName>{fixtureData?.competitors["away"].name}</TeamName>
              </Col>
            </Row>
          </Col>
        </StyledMobileHeader>
      );
    }
  };

  const matchTab = () => {
    if (markets.length > 0 && fixtureData) {
      return (
        <Tabs.TabPane tab={t("MATCH")} key="2">
          <FixtureComponent
            markets={markets.filter((el: any) =>
              Object.keys(el)[0].includes("MATCH"),
            )}
            fixtureName={fixtureData?.fixtureName}
            competitors={fixtureData?.competitors}
            fixtureStatus={fixtureData?.status}
            fixtureId={fixtureData?.fixtureId}
            sportId={fixtureData?.sport.sportId}
          />
        </Tabs.TabPane>
      );
    }
  };

  const generateTabs = () =>
    Object.entries(marketsWithMaps).map(([key, value]) => (
      <Tabs.TabPane tab={t("MAP", { number: key })} key={`MAP_${key}`}>
        {fixtureData && (
          <FixtureComponent
            markets={value}
            fixtureName={fixtureData?.fixtureName}
            competitors={fixtureData?.competitors}
            fixtureStatus={fixtureData?.status}
            fixtureId={fixtureData?.fixtureId}
            sportId={fixtureData?.sport.sportId}
          />
        )}
      </Tabs.TabPane>
    ));

  const domainName = typeof window !== "undefined" ? window.location.host : "";

  return (
    <>
      <Head>
        <link
          rel="canonical"
          href={`https://${domainName}/esports-bets/${gameFilter}/match/${fixtureId}`}
        />
      </Head>
      {isErrorPageVisible && <ErrorPage statusCode={404} />}
      <Head>
        <title>{t("MATCH")}</title>
      </Head>
      <SpinnerContainer>
        <CoreSpin spinning={isLoading} />
      </SpinnerContainer>
      {generateHeader()}
      {generateMobileHeader()}
      <Container>
        {!isLoading && fixtureData && (
          <Row justify="center" gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
            <Col span="24">
              <div>
                <StyledTabs defaultActiveKey="1">
                  <Tabs.TabPane tab={t("ALL")} key="1">
                    <FixtureComponent
                      markets={marketsForAllTab}
                      fixtureName={fixtureData?.fixtureName}
                      competitors={fixtureData?.competitors}
                      fixtureStatus={fixtureData?.status}
                      fixtureId={fixtureData?.fixtureId}
                      sportId={fixtureData?.sport.sportId}
                    />
                  </Tabs.TabPane>
                  {matchTab()}
                  {generateTabs()}
                </StyledTabs>
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </>
  );
}

Fixture.namespacesRequired = [...defaultNamespaces, "fixture"];

export default Fixture;
