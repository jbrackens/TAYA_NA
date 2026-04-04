import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { FixtureListComponent } from "../../layout/fixture-list";
import { useSelector, useDispatch } from "react-redux";
import {
  CurrentGame,
  CurrentGameTournament,
  setOddsFormat,
  selectOddsFormat,
} from "../../../lib/slices/settingsSlice";
import { useEffect, useMemo, useState } from "react";
import {
  FixtureListContainer,
  OddsFormatLabel,
  OddsFormatWrap,
  SportsbookControlBar,
  SportsbookFilterButton,
  SportsbookFilterGroup,
  SportsbookHero,
  SportsbookHeroEyebrow,
  SportsbookHeroIcon,
  SportsbookHeroMain,
  SportsbookHeroSide,
  SportsbookHeroSubtitle,
  SportsbookHeroTitle,
  SportsbookHeroTitleBlock,
  SportsbookHeroTitleRow,
  SportsbookLiveDot,
  SportsbookPageSurface,
  SportsbookPill,
  SportsbookPillRow,
  SportsbookStatCard,
  SportsbookStatGrid,
  SportsbookStatLabel,
  SportsbookStatValue,
  SportsbookToggleButton,
  SportsbookToggleGroup,
  SportsbookQuickSwitchButton,
  SportsbookQuickSwitchLabel,
  SportsbookQuickSwitchRail,
  SportsbookQuickSwitchSection,
  SportsbookQuickSwitchStack,
} from "./index.styled";
import { useRouter } from "next/router";
import { selectSports } from "../../../lib/slices/sportSlice";
import { useLocalStorageVariables, DisplayOddsEnum } from "@phoenix-ui/utils";
import { CoreSelect } from "../../ui/select";
import { parseIntegrationMode } from "../../../lib/integration-mode";
import { resolveEsportsHomeModules } from "./module-registry";
import {
  buildSportsLeaguePath,
  buildSportsSportPath,
  dedupeSportLikeItems,
  isSportsRoutePath,
  resolveLeagueRouteKey,
  resolveSportRouteKey,
} from "../../../lib/sports-routing";
import { BarChart3, Clock3, Gamepad2, Layers, Trophy } from "lucide-react";

const {
  SPORTSBOOK_INTEGRATION_MODE,
  SPORTSBOOK_ESPORTS_HOME_MODULES,
} = require("next/config").default().publicRuntimeConfig;

type PageTitle = {
  title: string;
  avatarId: string | undefined;
};

type PageConfig = {
  showPromos: boolean;
  showFixtures: boolean;
  showTabs: boolean;
  showResultsTab: boolean;
};

function ESportsBets() {
  const router = useRouter();
  const resolvedGameFilter = resolveSportRouteKey(router.query, "home");
  const resolvedCompetitionId = resolveLeagueRouteKey(router.query);
  const isNativeSportsRoute = isSportsRoutePath(router.pathname);
  const { t } = useTranslation(["page-esports-bets"]);
  const sports = useSelector(selectSports);
  const baseModuleConfig = useMemo(
    () =>
      resolveEsportsHomeModules(
        parseIntegrationMode(SPORTSBOOK_INTEGRATION_MODE),
        SPORTSBOOK_ESPORTS_HOME_MODULES,
      ),
    [],
  );
  const [gameToDisplay, setGameToDisplay] = useState<CurrentGame>(undefined);
  const [competitionToDisplay, setCompetitionToDisplay] = useState<
    CurrentGameTournament
  >(undefined);
  const [pageTitle, setPageTitle] = useState<PageTitle>({
    title: "",
    avatarId: undefined,
  });
  const [fixtureStatus, setFixtureStatus] = useState<string>();
  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "tomorrow">(
    "all",
  );
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    showPromos: baseModuleConfig.showPromos,
    showFixtures: baseModuleConfig.showFixtures,
    showTabs: baseModuleConfig.showTabs,
    showResultsTab: baseModuleConfig.showResultsTab,
  });
  const [activeTab, setActiveTab] = useState<string>("matches");

  useEffect(() => {
    const filter = resolvedGameFilter;
    setGameToDisplay(undefined);
    setActiveTab("matches");
    const currentPageConfig: PageConfig = {
      showPromos: baseModuleConfig.showPromos,
      showFixtures: baseModuleConfig.showFixtures,
      showTabs: baseModuleConfig.showTabs,
      showResultsTab: baseModuleConfig.showResultsTab,
    };
    switch (filter) {
      case "home":
        setPageTitle({ title: "Sportsbook", avatarId: undefined });
        setFixtureStatus(undefined);
        break;
      case "in-play":
        setPageTitle({ title: "Live Events", avatarId: undefined });
        setFixtureStatus("IN_PLAY");
        currentPageConfig.showPromos = false;
        currentPageConfig.showResultsTab = false;
        break;
      case "upcoming":
        setPageTitle({ title: "Upcoming", avatarId: undefined });
        setFixtureStatus("UPCOMING");
        currentPageConfig.showPromos = false;
        currentPageConfig.showResultsTab = false;
        break;
      default:
        const selectedGame = sports.find((el) => el.abbreviation === filter);
        if (selectedGame) {
          setPageTitle({
            title: selectedGame.name.split(":")[0],
            avatarId: selectedGame.id,
          });
          setGameToDisplay(selectedGame);
          currentPageConfig.showPromos = false;
          setFixtureStatus(undefined);
        }
    }

    setPageConfig(currentPageConfig);
  }, [resolvedGameFilter, sports, resolvedCompetitionId, baseModuleConfig]);

  useEffect(() => {
    const currentPageConfig: PageConfig = { ...pageConfig };

    if (gameToDisplay) {
      const selectedCompetition = gameToDisplay.tournaments?.find(
        (el) => el?.id === resolvedCompetitionId,
      );
      setCompetitionToDisplay(selectedCompetition);
      currentPageConfig.showFixtures = baseModuleConfig.showFixtures;
      setPageConfig(currentPageConfig);
    }
  }, [gameToDisplay, resolvedCompetitionId, baseModuleConfig.showFixtures]);

  useEffect(() => {
    if (activeTab === "results") {
      setFixtureStatus("FINISHED");
      return;
    }

    if (resolvedGameFilter === "in-play") {
      setFixtureStatus("IN_PLAY");
      return;
    }

    if (resolvedGameFilter === "upcoming") {
      setFixtureStatus("UPCOMING");
      return;
    }

    setFixtureStatus(undefined);
  }, [activeTab, resolvedGameFilter]);

  const { Option, OptionContent } = CoreSelect;
  const { saveOddsFormat } = useLocalStorageVariables();
  const dispatch = useDispatch();
  const currentOddsFormat = useSelector(selectOddsFormat);

  const onOddsChange = (value: DisplayOddsEnum) => {
    dispatch(setOddsFormat(value));
    saveOddsFormat(value);
  };

  const domainName = typeof window !== "undefined" ? window.location.host : "";
  const canonicalPath = isNativeSportsRoute
    ? resolvedCompetitionId
      ? buildSportsLeaguePath(resolvedGameFilter, resolvedCompetitionId)
      : buildSportsSportPath(resolvedGameFilter)
    : "/esports-bets";
  const HeroIcon = pageTitle.avatarId ? Gamepad2 : Trophy;
  const quickFilters: Array<{ id: "all" | "today" | "tomorrow"; label: string }> = [
    { id: "all", label: "All" },
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
  ];
  const shouldRenderTabs = pageConfig.showTabs && pageConfig.showResultsTab;
  const visibleSports = useMemo(
    () =>
      dedupeSportLikeItems(
        sports.filter((sport) => sport.displayToPunters !== false),
      ),
    [sports],
  );
  const visibleSportsCount = visibleSports.length;
  const currentScopeLabel =
    competitionToDisplay?.name || pageTitle.title || "All active markets";
  const currentBoardLabel =
    fixtureStatus === "IN_PLAY"
      ? "Live board"
      : activeTab === "results"
      ? "Results board"
      : "Pre-match board";
  const heroSubtitle =
    resolvedGameFilter === "in-play"
      ? "Real-time markets, score updates, and rapid selection flow."
      : resolvedCompetitionId
      ? "Focused league view with quick access to match winner and expanded markets."
      : "Browse featured fixtures, move between sports quickly, and build slips without losing context.";
  const quickSwitchSports = visibleSports;
  const quickSwitchLeagues = gameToDisplay?.tournaments || [];
  const leagueSportKey = gameToDisplay?.abbreviation || resolvedGameFilter;

  return (
    <>
      <Head>
        <link rel="canonical" href={`https://${domainName}${canonicalPath}`} />
        <title>{t("TITLE")}</title>
      </Head>
      <SportsbookPageSurface>
        <SportsbookHero>
          <SportsbookHeroMain>
            <SportsbookHeroEyebrow>Stake-benchmarked sportsbook shell</SportsbookHeroEyebrow>
            <SportsbookHeroTitleRow>
              <SportsbookHeroIcon>
                <HeroIcon size={22} />
              </SportsbookHeroIcon>
              <SportsbookHeroTitleBlock>
                <SportsbookHeroTitle>{pageTitle.title || "Sportsbook"}</SportsbookHeroTitle>
                <SportsbookHeroSubtitle>{heroSubtitle}</SportsbookHeroSubtitle>
              </SportsbookHeroTitleBlock>
            </SportsbookHeroTitleRow>
            <SportsbookPillRow>
              <SportsbookPill>
                <SportsbookLiveDot />
                {fixtureStatus === "IN_PLAY" ? "Live markets prioritised" : "Fast pre-match browsing"}
              </SportsbookPill>
              <SportsbookPill>
                <Layers size={14} />
                {currentScopeLabel}
              </SportsbookPill>
              <SportsbookPill>
                <Clock3 size={14} />
                {quickFilter === "all"
                  ? "All dates"
                  : quickFilter === "today"
                  ? "Today only"
                  : "Tomorrow only"}
              </SportsbookPill>
            </SportsbookPillRow>
          </SportsbookHeroMain>
          <SportsbookHeroSide>
            <SportsbookStatGrid>
              <SportsbookStatCard>
                <SportsbookStatLabel>Board</SportsbookStatLabel>
                <SportsbookStatValue>{currentBoardLabel}</SportsbookStatValue>
              </SportsbookStatCard>
              <SportsbookStatCard>
                <SportsbookStatLabel>Scope</SportsbookStatLabel>
                <SportsbookStatValue>{currentScopeLabel}</SportsbookStatValue>
              </SportsbookStatCard>
              <SportsbookStatCard>
                <SportsbookStatLabel>Sports</SportsbookStatLabel>
                <SportsbookStatValue>{visibleSportsCount}</SportsbookStatValue>
              </SportsbookStatCard>
              <SportsbookStatCard>
                <SportsbookStatLabel>Odds</SportsbookStatLabel>
                <SportsbookStatValue>{`${currentOddsFormat}`.toUpperCase()}</SportsbookStatValue>
              </SportsbookStatCard>
            </SportsbookStatGrid>
          </SportsbookHeroSide>
        </SportsbookHero>

        <SportsbookQuickSwitchStack>
          <SportsbookQuickSwitchSection>
            <SportsbookQuickSwitchLabel>Sports</SportsbookQuickSwitchLabel>
            <SportsbookQuickSwitchRail>
              {quickSwitchSports.map((sport) => (
                <SportsbookQuickSwitchButton
                  key={sport.abbreviation}
                  type="button"
                  $active={resolvedGameFilter === sport.abbreviation}
                  onClick={() => router.push(buildSportsSportPath(sport.abbreviation))}
                >
                  {sport.name.split(":")[0]}
                </SportsbookQuickSwitchButton>
              ))}
            </SportsbookQuickSwitchRail>
          </SportsbookQuickSwitchSection>
          {gameToDisplay ? (
            <SportsbookQuickSwitchSection>
              <SportsbookQuickSwitchLabel>Leagues</SportsbookQuickSwitchLabel>
              <SportsbookQuickSwitchRail>
                <SportsbookQuickSwitchButton
                  type="button"
                  $active={!resolvedCompetitionId}
                  onClick={() =>
                    router.push(buildSportsSportPath(leagueSportKey))
                  }
                >
                  All leagues
                </SportsbookQuickSwitchButton>
                {quickSwitchLeagues.map((league) => {
                    if (!league?.id || !league?.name) {
                      return null;
                    }
                    const leagueId = `${league.id}`;
                    const leagueName = `${league.name}`;
                    return (
                      <SportsbookQuickSwitchButton
                        key={leagueId}
                        type="button"
                        $active={resolvedCompetitionId === leagueId}
                        onClick={() =>
                          router.push(
                            buildSportsLeaguePath(leagueSportKey, leagueId),
                          )
                        }
                      >
                        {leagueName}
                      </SportsbookQuickSwitchButton>
                    );
                  })}
              </SportsbookQuickSwitchRail>
            </SportsbookQuickSwitchSection>
          ) : null}
        </SportsbookQuickSwitchStack>

        <SportsbookControlBar>
          {shouldRenderTabs ? (
            <SportsbookToggleGroup>
              <SportsbookToggleButton
                type="button"
                $active={activeTab === "matches"}
                onClick={() => setActiveTab("matches")}
              >
                Matches
              </SportsbookToggleButton>
              <SportsbookToggleButton
                type="button"
                $active={activeTab === "results"}
                onClick={() => setActiveTab("results")}
              >
                Results
              </SportsbookToggleButton>
            </SportsbookToggleGroup>
          ) : (
            <SportsbookPill>
              <BarChart3 size={14} />
              {currentBoardLabel}
            </SportsbookPill>
          )}

          <SportsbookFilterGroup>
            {quickFilters.map((filterOption) => (
              <SportsbookFilterButton
                key={filterOption.id}
                type="button"
                $active={quickFilter === filterOption.id}
                onClick={() => setQuickFilter(filterOption.id)}
              >
                {filterOption.label}
              </SportsbookFilterButton>
            ))}
          </SportsbookFilterGroup>

          {baseModuleConfig.showOddsFormatSelect ? (
            <OddsFormatWrap>
              <OddsFormatLabel>{t("ODDS")}</OddsFormatLabel>
              <CoreSelect
                value={currentOddsFormat}
                onChange={onOddsChange}
              >
                <Option value={DisplayOddsEnum.DECIMAL}>
                  <OptionContent>{t("DECIMAL")}</OptionContent>
                </Option>
                <Option value={DisplayOddsEnum.AMERICAN}>
                  <OptionContent>{t("AMERICAN")}</OptionContent>
                </Option>
                <Option value={DisplayOddsEnum.FRACTIONAL}>
                  <OptionContent>{t("FRACTIONAL")}</OptionContent>
                </Option>
              </CoreSelect>
            </OddsFormatWrap>
          ) : null}
        </SportsbookControlBar>

        <FixtureListContainer>
          {pageConfig.showFixtures ? (
            <FixtureListComponent
              currentGame={gameToDisplay}
              competitionId={competitionToDisplay?.id}
              fixtureStatus={fixtureStatus}
              activeTab={activeTab}
              gameFilter={resolvedGameFilter}
              quickFilter={quickFilter}
            />
          ) : null}
        </FixtureListContainer>
      </SportsbookPageSurface>
    </>
  );
}

ESportsBets.namespacesRequired = [
  ...defaultNamespaces,
  "page-esports-bets",
  "fixture-list",
  "bet-button",
];

export default ESportsBets;
