import * as React from "react";
import styled from "styled-components";
import cn from "classnames";
import { useDispatch, useSelector } from "react-redux";
import { useSticky } from "@brandserver-client/hooks";
import { Breakpoints } from "@brandserver-client/ui";
import { getMobile } from "..";
import { GamesCategory } from "@brandserver-client/types";
import Search from "./Search/Search";
import GamesCategories from "./GamesCategories/GamesCategories";
import {
  getActiveCategory,
  getSearchQuery,
  setActiveGameCategory,
  setSearchQuery
} from "../games/duck";

interface Props {
  gamesOffsetTop: number;
  withCategories?: boolean;
}

interface StyledProps {
  offsetTop: number;
  withCategories: boolean;
}

const StyledGamesNav = styled.div<StyledProps>`
  height: 138px;
  background: ${({ theme }) => theme.palette.primaryLight};

  @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
    height: 40px;
  }

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    height: 104px;
  }

  nav {
    z-index: 1000;
    height: ${props => (props.withCategories ? "138px" : "auto")};
    width: 100vw;

    @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
      height: 40px;
    }

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      height: 104px;
    }

    &.games-nav--sticky {
      position: fixed;
      top: ${({ offsetTop }) => offsetTop}px;
      background: ${({ theme }) => theme.palette.primaryLight};
      box-shadow: ${({ theme }) => theme.shadows.toolbar};
    }

    &.games-nav--fixed {
      top: ${({ offsetTop }) => offsetTop}px;
      background: ${({ theme }) => theme.palette.primaryLight};
      position: fixed;
      z-index: 1005;
    }
  }

  .games-nav__separator {
    display: none;
    height: 30px;
    width: 1px;
    margin-left: 12px;
    background: ${({ theme }) => theme.palette.secondaryLight};

    @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
      display: inline-block;
    }
  }

  .games-nav__wrapper {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    padding: ${props => (props.withCategories ? "0px 0px 24px" : 0)};
    justify-content: space-between;

    @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
      flex-direction: row;
      align-items: center;
      padding: 0 10px;
    }

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      flex-direction: row-reverse;
      align-items: flex-end;
      padding: 0px 10px 32px;
      max-width: 1045px;
      margin: 0px auto;

      & > :first-child {
        margin-left: ${props => (props.withCategories ? "15px" : 0)};
        max-width: ${props => (props.withCategories ? "300px" : "unset")};
      }
    }
  }
`;

const GamesNav: React.FC<Props> = ({
  gamesOffsetTop,
  withCategories = true
}) => {
  const dispatch = useDispatch();

  const containerRef = React.useRef<HTMLDivElement>(null);

  const sticky = useSticky(containerRef, gamesOffsetTop);

  const [searchPopupIsOpen, setSearchPopupIsOpen] = React.useState(false);
  const isMobile = useSelector(getMobile);

  const activeCategory = useSelector(getActiveCategory);
  const searchQuery = useSelector(getSearchQuery);

  const handleSetActiveCategory = React.useCallback(
    (category: GamesCategory["tag"]) =>
      dispatch(setActiveGameCategory(category)),
    []
  );

  const handleIsActiveCategory = React.useCallback(
    (category: GamesCategory["tag"]) => category === activeCategory,
    [activeCategory]
  );

  const handleResetActiveCategory = React.useCallback(
    () => dispatch(setActiveGameCategory("all")),
    []
  );

  const handleSetSearchQuery = React.useCallback(
    (newSearchQuery: string) => dispatch(setSearchQuery(newSearchQuery)),
    []
  );

  const handleUpdateSearchQuery = React.useCallback(
    (searchQuery: string, queryKeywords = true) => {
      if (queryKeywords) {
        // If queryKeywords is false we don't want to update searchQuery's value
        handleSetSearchQuery(searchQuery);
      }

      window.dataLayer.push({
        event: "games_filter",
        value: searchQuery
      });
    },
    [handleSetSearchQuery]
  );

  const isAllCategory = React.useMemo(
    () => activeCategory === "all",
    [activeCategory]
  );

  React.useEffect(() => {
    if (
      containerRef &&
      containerRef.current &&
      window.pageYOffset > containerRef.current.offsetTop
    ) {
      window.scrollTo({
        top: containerRef.current.offsetTop - gamesOffsetTop,
        left: 0,
        behavior: "smooth"
      });
    }
  }, [searchQuery, activeCategory]);

  return (
    <StyledGamesNav
      ref={containerRef}
      offsetTop={gamesOffsetTop}
      withCategories={withCategories}
      onClick={() => void 0}
    >
      <nav
        className={cn({
          "games-nav--sticky": sticky,
          "games-nav--fixed": searchPopupIsOpen && isMobile
        })}
      >
        <div className="games-nav__wrapper">
          <Search
            searchQuery={searchQuery}
            searchPopupIsOpen={searchPopupIsOpen}
            setSearchPopupIsOpen={setSearchPopupIsOpen}
            updateSearchQuery={handleUpdateSearchQuery}
            isMobile={isMobile}
            isAllCategory={isAllCategory}
            resetActiveCategory={handleResetActiveCategory}
          />
          {withCategories && (
            <>
              <span className="games-nav__separator" />
              <GamesCategories
                isActiveCategory={handleIsActiveCategory}
                setActiveCategory={handleSetActiveCategory}
                setSearchQuery={handleSetSearchQuery}
              />
            </>
          )}
        </div>
      </nav>
    </StyledGamesNav>
  );
};

export { GamesNav };
