import * as React from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { Breakpoints } from "@brandserver-client/ui";
import { GamesCategory as GamesCategoryType } from "@brandserver-client/types";
import GamesCategory from "./GamesCategory";
import { getCategories } from "../../app";

interface Props {
  isActiveCategory(category: string): boolean;
  setActiveCategory: (category: GamesCategoryType["tag"]) => void;
  setSearchQuery: (arg: string) => void;
}

const StyledGamesCategories = styled.div`
  // In desktop view the overflow has to be on the main container due to the flexbox sizing issues
  // But on the mobile it has to be on nav-items due to padding issues
  overflow-x: auto;
  overflow-y: hidden;

  width: 100%;
  padding: 0 10px;

  @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
    padding: 0;
    width: fit-content;
    flex-shrink: 0;
  }

  @media screen and (min-width: 320px) and (max-width: 767px) and (orientation: landscape) {
    padding: 0 10px 0 12px;
  }

  .nav-items {
    display: flex;
    height: 30px;
    // Remove outline when tapping
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    overflow-x: auto;
    overflow-y: hidden;

    @media ${({ theme }) => theme.breakpoints.up(Breakpoints.desktop)} {
      height: 40px;
    }
    /* Hide scrollbar for IE, Edge and Firefox */
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    /* Hide scrollbar for Chrome, Safari and Opera */
    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const GamesCategories: React.FC<Props> = ({
  isActiveCategory,
  setActiveCategory,
  setSearchQuery
}) => {
  const navItemsWrapperRef = React.useRef<HTMLDivElement>(null);

  const handleCategoryClick = React.useCallback(
    (category: GamesCategoryType["tag"]) => {
      setActiveCategory(category);
      setSearchQuery("");
    },
    []
  );

  const gamesCategories = useSelector(getCategories);

  return (
    <StyledGamesCategories ref={navItemsWrapperRef}>
      <ul className="nav-items">
        {gamesCategories.map(category => (
          <GamesCategory
            key={category.tag}
            category={category}
            handleCategoryClick={handleCategoryClick}
            isActiveCategory={isActiveCategory}
          />
        ))}
      </ul>
    </StyledGamesCategories>
  );
};

export default GamesCategories;
