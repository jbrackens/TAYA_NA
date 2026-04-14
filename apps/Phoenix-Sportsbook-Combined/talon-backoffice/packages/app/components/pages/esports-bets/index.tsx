import Head from "next/head";
import { useTranslation } from "i18n";
import { defaultNamespaces } from "../defaults";
import { Tabs, Row } from "antd";
import { FixtureListComponent } from "../../layout/fixture-list";
import { useSelector, useDispatch } from "react-redux";
import {
  CurrentGame,
  CurrentGameTournament,
  setOddsFormat,
  selectOddsFormat,
} from "../../../lib/slices/settingsSlice";
import { useEffect, useState } from "react";
import { AvatarComponent } from "../../avatar";
import {
  StyledCarousel,
  PageTitle,
  FixtureListContainer,
  PageTitleContainer,
  ColumnNoPadding,
  SelectLabelContainer,
  OddsFormatSelectContainer,
} from "./index.styled";
import { useRouter } from "next/router";
import { selectSports } from "../../../lib/slices/sportSlice";
import { useLocalStorageVariables, DisplayOddsEnum } from "@phoenix-ui/utils";
import { CoreSelect } from "../../ui/select";
import { SelectContainer } from "../../ui/form/index.styled";

const { TabPane } = Tabs;

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
  const { gameFilter, competitionId } = router.query;
  const { t } = useTranslation(["page-esports-bets"]);
  const sports = useSelector(selectSports);
  const [gameToDisplay, setGameToDisplay] = useState<CurrentGame>(undefined);
  const [competitionToDisplay, setCompetitionToDisplay] = useState<
    CurrentGameTournament
  >(undefined);
  const [pageTitle, setPageTitle] = useState<PageTitle>({
    title: "",
    avatarId: undefined,
  });
  const [fixtureStatus, setFixtureStatus] = useState<string>();
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    showPromos: false,
    showFixtures: false,
    showTabs: false,
    showResultsTab: false,
  });
  const [activeTab, setActiveTab] = useState<string>();

  useEffect(() => {
    const filter = gameFilter ? gameFilter : "home";
    setGameToDisplay(undefined);
    setActiveTab("matches");
    const currentPageConfig = pageConfig;
    switch (filter) {
      case "home":
        setPageTitle({ title: "", avatarId: undefined });
        setFixtureStatus(undefined);
        currentPageConfig.showPromos = true;
        currentPageConfig.showTabs = true;
        currentPageConfig.showResultsTab = true;
        currentPageConfig.showFixtures = true;
        break;
      case "in-play":
        setPageTitle({ title: "In-Play", avatarId: undefined });
        setFixtureStatus("IN_PLAY");
        currentPageConfig.showResultsTab = false;
        currentPageConfig.showFixtures = true;
        break;
      case "upcoming":
        setPageTitle({ title: "Upcoming", avatarId: undefined });
        setFixtureStatus("UPCOMING");
        currentPageConfig.showResultsTab = false;
        currentPageConfig.showFixtures = true;
        break;
      default:
        const selectedGame = sports.find((el) => el.abbreviation === filter);
        if (selectedGame) {
          // remove this split once backend updates csgo game name
          setPageTitle({
            title: selectedGame.name.split(":")[0],
            avatarId: selectedGame.id,
          });
          setGameToDisplay(selectedGame);
          currentPageConfig.showTabs = true;
          currentPageConfig.showResultsTab = true;

          if (!competitionId) {
            currentPageConfig.showFixtures = true;
          }
          setFixtureStatus(undefined);
        }
    }

    setPageConfig(currentPageConfig);
  }, [gameFilter, sports]);

  useEffect(() => {
    const currentPageConfig = pageConfig;

    if (gameToDisplay) {
      const selectedCompetition = gameToDisplay.tournaments?.find(
        (el) => el?.id === competitionId,
      );
      setCompetitionToDisplay(selectedCompetition);
      currentPageConfig.showFixtures = true;
      setPageConfig(currentPageConfig);
    }
  }, [gameToDisplay, competitionId]);

  useEffect(() => {
    if (activeTab === "results") setFixtureStatus("FINISHED");
    if (
      gameFilter !== "in-play" &&
      gameFilter !== "upcoming" &&
      (!activeTab || activeTab === "matches")
    ) {
      setFixtureStatus(undefined);
    }
  }, [activeTab]);

  const carouselSettings = {
    // arrows: true,
    // slidesToShow: 3,
    // slidesToScroll: 3,
    // responsive: [
    //   {
    //     breakpoint: 1300,
    //     settings: {
    //       slidesToShow: 2,
    //       slidesToScroll: 1,
    //     },
    //   },
    //   {
    //     breakpoint: 576,
    //     settings: {
    //       slidesToShow: 1,
    //       slidesToScroll: 1,
    //     },
    //   },
    // ],
  };

  const { Option, OptionContent } = CoreSelect;
  const { saveOddsFormat } = useLocalStorageVariables();
  const dispatch = useDispatch();
  const currentOddsFormat = useSelector(selectOddsFormat);

  const onOddsChange = (value: string) => {
    dispatch(setOddsFormat(value));
    saveOddsFormat(value);
  };

  const oddsFormatSelect = (
    <OddsFormatSelectContainer>
      <SelectLabelContainer>{t("ODDS")}</SelectLabelContainer>
      <SelectContainer>
        <CoreSelect
          dropdownStyle={{ backgroundColor: "transparent" }}
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
      </SelectContainer>
    </OddsFormatSelectContainer>
  );

  const domainName = typeof window !== "undefined" ? window.location.host : "";

  return (
    <>
      <Head>
        <link rel="canonical" href={`https://${domainName}/esports-bets`} />
        <title>{t("TITLE")}</title>
      </Head>
      {pageConfig.showPromos && (
        <StyledCarousel {...carouselSettings}>
          <div style={{ paddingRight: "10px" }}>
            {/* <img
              src="/images/promo_1.jpg"
              style={{
                maxWidth: "100%",
                marginRight: "10px",
                borderRadius: "10px",
              }}
            ></img> */}
            {/* <img
              src="/images/vie-banner.jpeg"
              style={{
                width: "100%",
                marginRight: "10px",
                borderRadius: "10px",
              }}
            ></img> */}
          </div>
          {/* <div>
            <img
              src="/images/promo_2.jpeg"
              style={{ maxWidth: "100%", borderRadius: "10px" }}
            ></img>
          </div>
          <div>
            <img
              src="/images/promo_3.jpg"
              style={{ maxWidth: "100%", borderRadius: "10px" }}
            ></img>
          </div>
          <div>
            <img
              src="/images/promo_1.jpg"
              style={{ maxWidth: "100%", borderRadius: "10px" }}
            ></img>
          </div> */}
        </StyledCarousel>
      )}

      <Row justify="center" gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
        <ColumnNoPadding span="24">
          <FixtureListContainer>
            {pageConfig.showTabs && (
              <Tabs
                onChange={setActiveTab}
                activeKey={activeTab}
                tabBarExtraContent={oddsFormatSelect}
              >
                {pageConfig.showResultsTab && (
                  <TabPane tab={t("MATCHES")} key="matches"></TabPane>
                )}
                {pageConfig.showResultsTab && (
                  <TabPane tab={t("RESULTS")} key="results"></TabPane>
                )}
              </Tabs>
            )}
            <PageTitleContainer>
              {pageTitle.avatarId && (
                <span>
                  <AvatarComponent
                    id={pageTitle.avatarId}
                    shape="square"
                    type="sports"
                  />
                </span>
              )}

              <PageTitle>{pageTitle?.title || ""}</PageTitle>
            </PageTitleContainer>
            {pageConfig.showFixtures && (
              <FixtureListComponent
                currentGame={gameToDisplay}
                competitionId={competitionToDisplay?.id}
                fixtureStatus={fixtureStatus}
                activeTab={activeTab}
              />
            )}
          </FixtureListContainer>
        </ColumnNoPadding>
      </Row>
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
