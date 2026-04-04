import React, { useState, useEffect, memo, useContext } from "react";
import { Collapse, List } from "antd";
import { CoreSpin } from "./../../../ui/spin";
import {
  SidebarContainer,
  StyledPanel,
  StyledListItem,
  MenuItemTitle,
  MenuItemStarContainer,
  MenuContainer,
  GameMenuContainer,
  LogoContainer,
  MobileLinks,
  MobileLink,
  StyledBadge,
} from "./index.styled";
import { useTranslation } from "i18n";
import { userPreferences } from "@phoenix-ui/utils";
import { CustomMenuItem } from "./CustomMenuItem";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import {
  selectLocation,
  LocationEnum,
  Link as LinkType,
} from "../../../../lib/slices/navigationSlice";
import { selectSports, Sport } from "../../../../lib/slices/sportSlice";
import { Logo } from "../../../../components/layout/header/logo";
import { ThemeContext } from "styled-components";
import { LinkWrapper } from "../../../linkWrapper";

type SidebarMenuProps = {
  isCollapsed: boolean;
  isGamesListVisible: boolean;
  ref: any;
  isLoading: boolean | undefined;
};

const SidebarMenu: React.FC<SidebarMenuProps> = memo(
  React.forwardRef(({ isCollapsed, isGamesListVisible, isLoading }, ref) => {
    const { t } = useTranslation("sidebar");
    const { t: th } = useTranslation("header");
    const sports = useSelector(selectSports);
    const { getFavSports, setFavSports } = userPreferences();
    const favSports =
      typeof sessionStorage !== "undefined" ? getFavSports() : [];
    const [favSportsIdChanged, setFavSportsIdChanged] = useState("");
    const theme = useContext(ThemeContext);
    const defualtMenuitems: Array<LinkType> = [
      {
        id: "home",
        name: t("HOME"),
        abbreviation: "",
        noStar: true,
      },
      {
        id: "inPlay",
        name: t("IN_PLAY"),
        abbreviation: "in-play",
        noStar: true,
      },
      {
        id: "upcoming",
        name: t("UPCOMING"),
        abbreviation: "upcoming",
        noStar: true,
      },
    ];

    const router = useRouter();
    const { gameFilter, competitionId } = router.query as {
      gameFilter?: string;
      competitionId?: string;
    };
    const { pathname } = router;

    const currentLocation = useSelector(selectLocation);
    const accountNavMenuitems: Array<LinkType> = [
      {
        id: "account",
        name: t("ACCOUNT"),
        abbreviation: "/account",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "notifications",
        name: t("NOTIFICATIONS"),
        abbreviation: "/account/notifications",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "settings",
        name: t("SETTINGS"),
        abbreviation: "/account/settings",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "limits",
        name: t("LIMITS"),
        abbreviation: "/account/responsible-gaming",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "security",
        name: t("SECURITY"),
        abbreviation: "/account/security",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "transactions",
        name: t("TRANSACTIONS"),
        abbreviation: "/account/transactions",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "bet-history",
        name: t("BET_HISTORY"),
        abbreviation: "/account/bet-history",
        noStar: true,
        isUrlSeparate: true,
      },
      {
        id: "rg-history",
        name: t("RG_HISTORY"),
        abbreviation: "/account/rg-history",
        noStar: true,
        isUrlSeparate: true,
      },
    ];

    const rgMenuItem = {
      id: "rg",
      name: th("RESPONSIBLE_GAMING"),
      abbreviation: "/responsible-gaming",
      noStar: true,
      isUrlSeparate: true,
    };

    const favFavSportsToggle = (id: string) => {
      if (favSports !== null) {
        setFavSports(
          favSports.includes(id)
            ? favSports.filter((el) => el !== id)
            : [id, ...favSports],
        );
      } else {
        setFavSports([id]);
      }
    };

    useEffect(() => {
      if (favSportsIdChanged !== "") {
        favFavSportsToggle(favSportsIdChanged);
        setFavSportsIdChanged("");
      }
    }, [favSportsIdChanged]);

    const generateLeagueUrl = (abbreviation: string, leagueId: string) =>
      `/esports-bets/${abbreviation}/competition/${leagueId}`;

    const onStarClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setFavSportsIdChanged(id);
    };

    const isListItemCollapsable = (abbreviation: string) => {
      const item = sports.find((sport) => sport.abbreviation === abbreviation);
      return item?.tournaments && item.tournaments.length !== 0 ? true : false;
    };

    const generateListItemHref = (
      abbreviation: string,
      isUrlSeparate?: boolean,
    ) => {
      if (isUrlSeparate) {
        return `${abbreviation}`;
      }
      if (abbreviation === router.query?.gameFilter) {
        return "/esports-bets/";
      }
      return `/esports-bets/${abbreviation}`;
    };

    const CustomHeader: React.FC<any> = ({ children, game }) => {
      return (
        <LinkWrapper
          href={generateListItemHref(game.abbreviation, game.isUrlSeparate)}
        >
          <span>
            <CustomMenuItem
              id={game.id}
              iconUrl={game.iconUrl}
              name={game.name}
              favSports={favSports}
              onStarClick={onStarClick}
              isCollapsed={isCollapsed}
              noStar={game.noStar}
            />
            {children}
          </span>
        </LinkWrapper>
      );
    };

    const isMenuItemSelected = (url: string) => {
      if (url === "responsible-gaming" && pathname === "/responsible-gaming") {
        return true;
      }

      if (url === "" && pathname === "/esports-bets") {
        return true;
      }

      return url === gameFilter || url === pathname;
    };

    const gamesWithFavAttr: Array<Sport & { favourite: boolean }> = sports.map(
      (el) => {
        if (favSports !== null && favSports.includes(el.id)) {
          return {
            ...el,
            favourite: true,
          };
        } else {
          return {
            ...el,
            favourite: false,
          };
        }
      },
    );

    const sortedGames = gamesWithFavAttr.sort(
      (previous, next) => +next.favourite - +previous.favourite,
    );

    const listBasedOnLocation =
      currentLocation === LocationEnum.ACCOUNT
        ? [...accountNavMenuitems, rgMenuItem]
        : [...defualtMenuitems, ...sortedGames, rgMenuItem];

    const CustomCollapse = ({ games, ...rest }: any) => {
      const menuItems = (games: Array<Sport>) =>
        games.map((el) => {
          if (el.displayToPunters === false) {
            return false;
          }
          const noZeroFixturesTournaments = el.tournaments
            ? el.tournaments.filter((el) => el.numberOfFixtures !== 0)
            : [];
          return (
            <StyledPanel
              el={el}
              {...rest}
              key={el.abbreviation}
              header={<CustomHeader game={el} />}
              showArrow={false}
              selected={isMenuItemSelected(el.abbreviation)}
            >
              {noZeroFixturesTournaments.length !== 0 && (
                <List
                  size="small"
                  dataSource={noZeroFixturesTournaments}
                  renderItem={(item) => (
                    <StyledListItem selected={item.id === competitionId}>
                      <LinkWrapper
                        href={generateLeagueUrl(el.abbreviation, item.id)}
                        style={{ display: "flex", width: "100%" }}
                      >
                        <MenuItemTitle isCollapsed={isCollapsed}>
                          {item.name}
                        </MenuItemTitle>
                        <MenuItemStarContainer>
                          <StyledBadge>{item.numberOfFixtures}</StyledBadge>
                        </MenuItemStarContainer>
                      </LinkWrapper>
                    </StyledListItem>
                  )}
                />
              )}
            </StyledPanel>
          );
        });

      const isMobileLinkSelected = (name: string) =>
        router.pathname.includes(name);

      return (
        <>
          {isLoading ? (
            <CoreSpin />
          ) : (
            <>
              <MobileLinks>
                <LinkWrapper href="/esports-bets">
                  <MobileLink isSelected={isMobileLinkSelected("esports-bets")}>
                    {th("ESPORTS_LINK")}
                  </MobileLink>
                </LinkWrapper>
                {/* <MobileLink
                  isSelected={isMobileLinkSelected("promotions")}
                  onClick={() => router.push("/promotions")}
                >
                  {th("PROMOTIONS_LINK")}
                </MobileLink> */}
              </MobileLinks>
              <Collapse
                activeKey={
                  gameFilter && isListItemCollapsable(gameFilter)
                    ? gameFilter
                    : ""
                }
              >
                {menuItems(games)}
              </Collapse>
            </>
          )}
        </>
      );
    };

    const renderMenu = () => {
      return (
        <>
          {currentLocation === LocationEnum.ACCOUNT ? (
            <MenuContainer
              isCollapsed={isCollapsed}
              isGamesListVisible={isGamesListVisible}
              //@ts-ignore
              ref={ref}
            >
              <CustomCollapse games={listBasedOnLocation} />
            </MenuContainer>
          ) : (
            <GameMenuContainer
              isCollapsed={isCollapsed}
              isGamesListVisible={isGamesListVisible}
              //@ts-ignore
              ref={ref}
            >
              <CustomCollapse games={listBasedOnLocation} />
            </GameMenuContainer>
          )}
        </>
      );
    };

    return (
      <SidebarContainer>
        <LinkWrapper href="/">
          <LogoContainer>
            <Logo theme={theme.logo} />
          </LogoContainer>
        </LinkWrapper>
        {renderMenu()}
      </SidebarContainer>
    );
  }),
);

export { SidebarMenu };
